namespace Masterloop.Cloud.Core.Security
{
    public class TenantPermission : ObjectPermission
    {
        public TenantPermission(string accountId, int tenantId, bool canObserve, bool canControl, bool canAdmin)
            : base(canObserve, canControl, canAdmin)
        {
            AccountId = accountId;
            TenantId = tenantId;
        }

        public readonly string AccountId;

        public readonly int TenantId;
    }
}
