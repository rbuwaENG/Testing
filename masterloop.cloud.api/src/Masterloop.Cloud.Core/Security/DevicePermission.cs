namespace Masterloop.Cloud.Core.Security
{
    public class DevicePermission : ObjectPermission
    {
        public DevicePermission(string accountId, string mid, bool canObserve, bool canControl, bool canAdmin)
            : base (canObserve, canControl, canAdmin)
        {
            AccountId = accountId;
            MID = mid;
        }

        public readonly string AccountId;

        public readonly string MID;
    }
}
