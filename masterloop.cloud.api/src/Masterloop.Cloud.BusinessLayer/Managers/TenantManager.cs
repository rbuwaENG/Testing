using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.BusinessLayer.Services.Security;
using Masterloop.Cloud.Core.Security;
using Masterloop.Cloud.Core.Tenant;
using Masterloop.Cloud.Storage.Repositories.Interfaces;

namespace Masterloop.Cloud.BusinessLayer.Managers
{
    public class TenantManager : ITenantManager
    {
        ITenantRepository _tenantRepository;
        IUserRepository _userRepository;

        public TenantManager(ITenantRepository tenantRepository, IUserRepository userRepository)
        {
            _tenantRepository = tenantRepository;
            _userRepository = userRepository;
        }

        public Tenant[] GetTenants()
        {
            var tenants = _tenantRepository.GetAll();
            if (tenants == null)
                return new Tenant[] { };
            List<Tenant> simpleTenants = new List<Tenant>();
            foreach (var tenant in tenants)
            {
                Tenant simpleTenant = new Tenant()
                {
                    Id = tenant.Id,
                    Name = tenant.Name
                };
                var features = _tenantRepository.GetTenantFeatures(tenant.Id);
                if (features != null)
                {
                    simpleTenant.Features = features.ToArray();
                }
                var templates = _tenantRepository.GetTenantTemplates(tenant.Id);
                if (templates != null)
                {
                    simpleTenant.TemplateIds = templates.ToArray();
                }
                simpleTenants.Add(simpleTenant);
            }
            return simpleTenants.ToArray();
        }

        public int CreateTenant(string name)
        {
            Tenant[] tenants = GetTenants();
            if (tenants.Any(t => t.Name == name))
            {
                throw new ArgumentException($"Tenant with name '{name}' already exists.");
            }

            if (Regex.IsMatch(name, @"^[a-zA-Z0-9]+$"))
            {
                SecureTenant tenant = new SecureTenant();
                tenant.Name = name;
                tenant.Login = $"MCS_{name}";
                tenant.PreSharedKey = PasswordGenerator.GenerateRandomString(16);
                return _tenantRepository.Create(tenant);
            }
            else
            {
                throw new ArgumentException("Tenant name may only contain letters and digits.");
            }
        }

        public TenantPermission[] GetTenantUsers(int tenantId)
        {
            IEnumerable<TenantPermission> users = _tenantRepository.GetAllTenantUsers(tenantId);
            if (users != null)
            {
                return users.ToArray();
            }
            else
            {
                return null;
            }
        }

        public bool SetTenantPermission(TenantPermission permission)
        {
            if (_userRepository.Get(permission.AccountId) != null && _tenantRepository.Get(permission.TenantId) != null)
            {
                _tenantRepository.SetTenantPermission(permission);
                return true;
            }
            else
            {
                return false;
            }
        }

        public bool RemoveTenantPermission(int tenantId, string userId)
        {
            if (_userRepository.Get(userId) != null && _tenantRepository.Get(tenantId) != null)
            {
                return _tenantRepository.RemoveTenantPermission(tenantId, userId);
            }
            else
            {
                return false;
            }
        }

        public AddOnFeature[] GetTenantFeatures(int tenantId)
        {
            IEnumerable<AddOnFeature> features = _tenantRepository.GetTenantFeatures(tenantId);
            if (features != null)
            {
                return features.ToArray();
            }
            else
            {
                return null;
            }
        }

        public bool HasFeature(int tenantId, AddOnFeature feature)
        {
            IEnumerable<AddOnFeature> features = _tenantRepository.GetTenantFeatures(tenantId);
            if (features != null)
            {
                return features.Contains(feature);
            }
            else
            {
                return false;
            }
        }
    }
}