using Masterloop.Core.Types.DevSync;

namespace Masterloop.Cloud.BusinessLayer.Managers.Interfaces
{
    public interface IDevSyncManager
    {
        DevSyncResponse Sync(string MID, DevSyncRequest request);
    }
}