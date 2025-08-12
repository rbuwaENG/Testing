using System.Collections.Generic;
using Masterloop.Cloud.Core.Security;
using Masterloop.Cloud.Core.Tenant;

namespace Masterloop.Cloud.Storage.Repositories.Interfaces
{
    public interface ITenantRepository : IRepository<SecureTenant, int>
    {
        SecureTenant GetByLogin(string login);
        IEnumerable<TenantPermission> GetAllTenantUsers(int tenantId);
        IEnumerable<TenantPermission> GetAllUserTenants(string userId);
        TenantPermission GetTenantUser(int id, string accountId);
        void SetTenantPermission(TenantPermission permission);
        bool RemoveTenantPermission(int id, string userId);

        IEnumerable<string> GetTenantTemplates(int id);
        SecureTenant GetTenantByTemplate(string tid);
        bool AddTenantTemplate(int id, string templateId);
        bool RemoveTenantTemplate(int id, string templateId);

        IEnumerable<AddOnFeature> GetTenantFeatures(int id);
    }
}