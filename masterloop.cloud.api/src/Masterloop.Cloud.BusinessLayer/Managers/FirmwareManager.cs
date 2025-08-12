using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.BusinessLayer.Services.Firmware;
using Masterloop.Cloud.Storage.Codecs;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Firmware;
using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Security.Cryptography;

namespace Masterloop.Cloud.BusinessLayer.Managers
{
    /// <summary>
    /// Implementation of Firmware Manager.
    /// Note: This module depends on the HDiffPatch 2.5.3 and LZMA 18.02 obtained from:
    /// https://github.com/sisong/HDiffPatch
    /// https://www.7-zip.org/sdk.html
    /// These modules are written in C/C++, and must be compiled on target platform.
    /// </summary>
    public class FirmwareManager : IFirmwareManager
    {
        private readonly IFirmwareRepository _firmwareRepository;
        private readonly IFirmwareService _firmwareService;
        private const string _PATCH_FORMAT_HDIFFPATCH = "hdiffpatch";

        public FirmwareManager(IFirmwareRepository firmwareRepository, IFirmwareService firmwareService)
        {
            _firmwareRepository = firmwareRepository;
            _firmwareService = firmwareService;
        }

        #region Create
        public FirmwareReleaseDescriptor CreateFirmwareRelease(FirmwareRelease firmwareRelease)
        {
            // Insert blob in firmware-releases
            byte[] blobData = Convert.FromBase64String(firmwareRelease.BlobData);
            MD5 md5 = MD5.Create();
            byte[] firmwareMD5 = md5.ComputeHash(blobData);
            string firmwareMD5String = Convert.ToBase64String(firmwareMD5);

            // Create instance in database
            FirmwareReleaseDescriptor frd = new FirmwareReleaseDescriptor()
            {
                VersionNo = firmwareRelease.VersionNo,
                ReleaseDate = DateTime.UtcNow,
                Size = blobData.Length,
                FirmwareMD5 = firmwareMD5String,
                Url = null
            };

            frd.Id = _firmwareRepository.CreateRelease(frd, firmwareRelease.DeviceTemplateId, blobData);

            // If the first release, set it as default.
            FirmwareReleaseDescriptor currentFirmwareRelease = _firmwareRepository.GetCurrentRelease(firmwareRelease.DeviceTemplateId);
            if (currentFirmwareRelease == null)
            {
                _firmwareRepository.SetCurrentRelease(firmwareRelease.DeviceTemplateId, frd.Id);
            }
            return frd;
        }

        private void CreateFirmwareHDiffPatch(int fromFirmwareReleaseId, FirmwareReleaseDescriptor toFirmwareRelease, string hdiffzPath)
        {
            // Save OLD to temporary file.
            FirmwareReleaseDescriptor fromDescriptor = GetFirmwareRelease(fromFirmwareReleaseId);
            if (fromDescriptor == null) throw new ArgumentException(fromFirmwareReleaseId.ToString());
            byte[] fromBytes = _firmwareRepository.GetReleaseBlob(fromFirmwareReleaseId);
            if (fromBytes == null) throw new ArgumentException("FromFirmware is empty.");
            string oldFile = Path.GetTempFileName();
            File.WriteAllBytes(oldFile, fromBytes);

            // Save NEW to temporary file.
            byte[] toBytes = _firmwareRepository.GetReleaseBlob(toFirmwareRelease.Id);
            if (toBytes == null) throw new ArgumentException("ToFirmware is empty.");
            string newFile = Path.GetTempFileName();
            File.WriteAllBytes(newFile, toBytes);

            // Generate DELTA temporary file.
            string deltaFile = Path.GetTempFileName();

            // Call hdiffz with OLD + NEW + DELTA.
            Process p = new Process();
            p.StartInfo.UseShellExecute = false;
            p.StartInfo.RedirectStandardOutput = true;
            p.StartInfo.FileName = hdiffzPath;
            p.StartInfo.Arguments = $"{oldFile} {newFile} {deltaFile}";
            p.Start();
            p.WaitForExit();
            if (p.ExitCode == 0)
            {
                // Load DELTA into memory stream.
                MemoryStream patchStream = new MemoryStream();
                using (FileStream deltaFileStream = new FileStream(deltaFile, FileMode.Open))
                {
                    deltaFileStream.CopyTo(patchStream);
                }
                // Delete OLD + NEW + DELTA
                try
                {
                    File.Delete(oldFile);
                    File.Delete(newFile);
                    File.Delete(deltaFile);
                }
                catch (Exception) { }  // Ignore any exceptions, worst case the temp files are stuck in the temporary storage and must be removed later.

                byte[] patchBytes = patchStream.ToArray();
                StorePatch(fromFirmwareReleaseId, toFirmwareRelease, patchBytes, _PATCH_FORMAT_HDIFFPATCH);
            }
        }

        private void StorePatch(int fromFirmwareReleaseId, FirmwareReleaseDescriptor toFirmwareRelease, byte[] patchBytes, string encoding)
        {
            MD5 md5 = MD5.Create();
            byte[] patchMD5 = md5.ComputeHash(patchBytes, 0, patchBytes.Length);
            string patchMD5String = Convert.ToBase64String(patchMD5);

            // Store in blob storage.
            FirmwarePatchDescriptor fpd = new FirmwarePatchDescriptor()
            {
                FromFirmwareReleaseId = fromFirmwareReleaseId,
                ToFirmwareReleaseId = toFirmwareRelease.Id,
                ReleaseDate = toFirmwareRelease.ReleaseDate,
                Size = patchBytes.Length,
                Encoding = encoding,
                PatchMD5 = patchMD5String,
                FirmwareMD5 = toFirmwareRelease.FirmwareMD5,
            };
            _firmwareRepository.CreatePatch(fpd, patchBytes);
        }
        #endregion

        #region Read
        public FirmwareReleaseDescriptor GetCurrentFirmwareRelease(string templateId)
        {
            return _firmwareRepository.GetCurrentRelease(templateId);
        }

        public FirmwareReleaseDescriptor GetFirmwareRelease(int releaseId)
        {
            return _firmwareRepository.GetRelease(releaseId);
        }

        public FirmwareReleaseDescriptor GetFirmwareRelease(string templateId, string versionNo)
        {
            return _firmwareRepository.GetRelease(templateId, versionNo);
        }

        public string GetFirmwareReleaseTemplate(int releaseId)
        {
            return _firmwareRepository.GetReleaseTemplate(releaseId);
        }

        public FirmwareReleaseDescriptor[] GetFirmwareReleases(string templateId)
        {
            return _firmwareRepository.GetAllReleases(templateId).ToArray();
        }

        public FirmwarePatchDescriptor GetCurrentFirmwarePatch(string templateId, int fromFirmwareReleaseId)
        {
            FirmwareReleaseDescriptor currentFirmwareRelease = _firmwareRepository.GetCurrentRelease(templateId);
            return GetFirmwarePatch(fromFirmwareReleaseId, currentFirmwareRelease.Id);
        }

        public FirmwarePatchDescriptor GetCurrentFirmwarePatch(string templateId, string fromFirmwareVersionNo)
        {
            FirmwareReleaseDescriptor fromFirmwareRelease = GetFirmwareRelease(templateId, fromFirmwareVersionNo);
            FirmwareReleaseDescriptor currentFirmwareRelease = _firmwareRepository.GetCurrentRelease(templateId);
            return GetFirmwarePatch(fromFirmwareRelease.Id, currentFirmwareRelease.Id);
        }

        public FirmwarePatchDescriptor GetFirmwarePatch(int fromFirmwareReleaseId, int toFirmwareReleaseId)
        {
            string encoding = _PATCH_FORMAT_HDIFFPATCH;

            if (fromFirmwareReleaseId == toFirmwareReleaseId)
            {
                return null;
            }

            // Check if "from firmware" is the current version, in that case return null.
            FirmwareReleaseDescriptor toFirmwareRelease = _firmwareRepository.GetRelease(toFirmwareReleaseId);

            // Check if patch (from firmwareReleaseId, current firmwareReleaseId) already exist in storage.
            FirmwarePatchDescriptor patchDescriptor = _firmwareRepository.GetPatch(fromFirmwareReleaseId, toFirmwareReleaseId, encoding);

            if (patchDescriptor == null)  // Does not exist, patch must be created and stored.
            {
                if (encoding == _PATCH_FORMAT_HDIFFPATCH)
                {
                    CreateFirmwareHDiffPatch(fromFirmwareReleaseId, toFirmwareRelease, _firmwareService.HDiffzPath);
                }
                else
                {
                    throw new ArgumentException($"Unsupported firmware patch encoding: {encoding}");
                }
                patchDescriptor = _firmwareRepository.GetPatch(fromFirmwareReleaseId, toFirmwareReleaseId, encoding);
            }

            // Return patch descriptor.
            return patchDescriptor;
        }

        public byte[] GetFirmwareBlob(int releaseId)
        {
            return _firmwareRepository.GetReleaseBlob(releaseId);
        }

        public byte[] GetPatchBlob(int fromReleaseId, int toReleaseId, string encoding)
        {
            return _firmwareRepository.GetPatchBlob(fromReleaseId, toReleaseId, encoding);
        }

        public string GetFirmwareReleaseBlobUrl(string host, string TID, FirmwareReleaseDescriptor frd)
        {
            string protocol = _firmwareService.PublishProtocol;
            byte[] md5 = Convert.FromBase64String(frd.FirmwareMD5);
            string md5Url = Base64UrlTextEncoder.Encode(md5);
            return $"{protocol}://{host}/api/templates/{TID}/firmware/{frd.Id}/data/{md5Url}";
        }

        public string GetFirmwarePatchBlobUrl(string host, string TID, FirmwarePatchDescriptor fpd)
        {
            string protocol = _firmwareService.PublishProtocol;
            byte[] md5 = Convert.FromBase64String(fpd.FirmwareMD5);
            string md5Url = Base64UrlTextEncoder.Encode(md5);
            return $"{protocol}://{host}/api/templates/{TID}/firmware/{fpd.Encoding}/{fpd.FromFirmwareReleaseId}/{fpd.ToFirmwareReleaseId}/data/{md5Url}";
        }

        #endregion

        #region Update
        public bool SetCurrentFirmware(string templateId, int releaseId)
        {
            FirmwareReleaseDescriptor frdCurrent = _firmwareRepository.GetCurrentRelease(templateId);
            if (frdCurrent != null && releaseId < frdCurrent.Id)
            {
                return false;
            }
            else
            {
                return _firmwareRepository.SetCurrentRelease(templateId, releaseId);
            }
        }
        #endregion
    }
}