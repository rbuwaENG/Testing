using Masterloop.Cloud.Core.Security;
using Masterloop.Cloud.Core.Tenant;

namespace Masterloop.Cloud.BusinessLayer.Managers.Interfaces
{
    public interface ITenantManager
    {
        Tenant[] GetTenants();
        int CreateTenant(string name);
        TenantPermission[] GetTenantUsers(int tenantId);
        bool SetTenantPermission(TenantPermission permission);
        bool RemoveTenantPermission(int tenantId, string userId);
        AddOnFeature[] GetTenantFeatures(int tenantId);
        bool HasFeature(int tenantId, AddOnFeature feature);
    }
}