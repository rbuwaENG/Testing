using System;
using Masterloop.Cloud.BusinessLayer.Managers;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.BusinessLayer.Services.Firmware;
using Masterloop.Cloud.Storage.Providers;
using Masterloop.Cloud.Storage.Repositories;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Firmware;

namespace Masterloop.Tools.TestTool
{
    public class RepoTester
    {
        public static void TestFirmware(string pgsqlConnectionString)
        {
            string TID = "MASTERTEST";
            string hdiffz = "hdiffz";

            IDbProvider dbProvider = new PostgreSqlDbProvider(pgsqlConnectionString);
            IFirmwareService firmwareSvc = new FirmwareService(hdiffz, "http");
            IFirmwareRepository repo = new FirmwareRepository(dbProvider);
            IFirmwareManager mgr = new FirmwareManager(repo, firmwareSvc);

            byte[] inData = GenerateBlob(64 * 1024);
            string b64Data = Convert.ToBase64String(inData);
            FirmwareRelease fr = new FirmwareRelease()
            {
                DeviceTemplateId = TID,
                VersionNo = DateTime.UtcNow.ToString("o"),
                BlobData = b64Data,
                BlobSize = inData.Length
            };

            FirmwareReleaseDescriptor newRelease = mgr.CreateFirmwareRelease(fr);

            mgr.SetCurrentFirmware(TID, newRelease.Id);

            FirmwareReleaseDescriptor currentTemplateRelease = mgr.GetCurrentFirmwareRelease(TID);

            FirmwareReleaseDescriptor specificRelease = mgr.GetFirmwareRelease(1);

            string releaseTemplateId = mgr.GetFirmwareReleaseTemplate(specificRelease.Id);

            FirmwareReleaseDescriptor[] templateReleases = mgr.GetFirmwareReleases(TID);

            byte[] currentTemplateReleaseData = mgr.GetFirmwareBlob(currentTemplateRelease.Id);

            FirmwarePatchDescriptor currentPatch = mgr.GetCurrentFirmwarePatch(TID, specificRelease.Id);
            byte[] currentPatchData = mgr.GetPatchBlob(currentPatch.FromFirmwareReleaseId, currentPatch.ToFirmwareReleaseId, currentPatch.Encoding);

            FirmwarePatchDescriptor specificPatch = mgr.GetFirmwarePatch(specificRelease.Id, currentTemplateRelease.Id);
            byte[] specificPatchData = mgr.GetPatchBlob(specificPatch.FromFirmwareReleaseId, specificPatch.ToFirmwareReleaseId, specificPatch.Encoding);
        }

        private static byte[] GenerateBlob(int length)
        {
            Random rnd = new Random((int)DateTime.UtcNow.Ticks);
            byte[] b = new byte[length];
            for (int i = 0; i < length; i++)
            {
                b[i] = (byte)(rnd.Next() % 256);
            }
            return b;
        }
    }
}