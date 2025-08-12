using System.Collections.Generic;
using Masterloop.Core.Types.Firmware;

namespace Masterloop.Cloud.Storage.Repositories.Interfaces
{
    public interface IFirmwareRepository
    {
        int CreateRelease(FirmwareReleaseDescriptor frd, string templateId, byte[] blob);
        FirmwareReleaseDescriptor GetRelease(int releaseId);
        FirmwareReleaseDescriptor GetRelease(string templateId, string versionNo);
        string GetReleaseTemplate(int releaseId);
        FirmwareReleaseDescriptor GetCurrentRelease(string templateId);
        bool SetCurrentRelease(string templateId, int releaseId);
        IEnumerable<FirmwareReleaseDescriptor> GetAllReleases(string templateId);
        byte[] GetReleaseBlob(int releaseId);

        bool CreatePatch(FirmwarePatchDescriptor fpd, byte[] blob);
        FirmwarePatchDescriptor GetPatch(int fromReleaseId, int toReleaseId, string encoding);
        byte[] GetPatchBlob(int fromReleaseId, int toReleaseId, string encoding);
    }
}