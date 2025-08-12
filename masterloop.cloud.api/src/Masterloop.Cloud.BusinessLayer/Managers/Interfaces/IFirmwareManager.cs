using Masterloop.Core.Types.Firmware;

namespace Masterloop.Cloud.BusinessLayer.Managers.Interfaces
{
    public interface IFirmwareManager
    {
        FirmwareReleaseDescriptor CreateFirmwareRelease(FirmwareRelease firmwareRelease);
        bool SetCurrentFirmware(string templateId, int releaseId);
        FirmwareReleaseDescriptor GetCurrentFirmwareRelease(string templateId);
        FirmwareReleaseDescriptor GetFirmwareRelease(int releaseId);
        FirmwareReleaseDescriptor GetFirmwareRelease(string templateId, string versionNo);
        string GetFirmwareReleaseTemplate(int releaseId);
        FirmwareReleaseDescriptor[] GetFirmwareReleases(string templateId);
        byte[] GetFirmwareBlob(int releaseId);
        string GetFirmwareReleaseBlobUrl(string host, string TID, FirmwareReleaseDescriptor frd);
        string GetFirmwarePatchBlobUrl(string host, string TID, FirmwarePatchDescriptor fpd);

        FirmwarePatchDescriptor GetCurrentFirmwarePatch(string templateId, int fromFirmwareReleaseId);
        FirmwarePatchDescriptor GetCurrentFirmwarePatch(string templateId, string fromFirmwareVersionNo);
        FirmwarePatchDescriptor GetFirmwarePatch(int fromFirmwareReleaseId, int toFirmwareReleaseId);
        byte[] GetPatchBlob(int fromReleaseId, int toReleaseId, string encoding);
   }
}