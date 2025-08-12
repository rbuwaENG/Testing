using System;
using System.Collections.Generic;
using System.Linq;
using Masterloop.Cloud.Storage.Providers;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Newtonsoft.Json;
using StackExchange.Redis;
using Masterloop.Cloud.Core.Tenant;
using Masterloop.Cloud.Core.Security;

namespace Masterloop.Cloud.Storage.Repositories
{
    /// <summary>
    /// Repository for tenants using Redis Cache.
    /// </summary>
    public class TenantRepository : ITenantRepository
    {
        protected ICacheProvider _cacheProvider;

        public TenantRepository(ICacheProvider cacheProvider)
        {
            _cacheProvider = cacheProvider;
        }

        public SecureTenant Get(int id)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Tenant);
            RedisValue value = connection.StringGet(id.ToString());
            if (value.HasValue)
            {
                return JsonConvert.DeserializeObject<SecureTenant>(value);
            }
            else
            {
                return null;
            }
        }

        public SecureTenant GetByLogin(string login)
        {
            SecureTenant[] tenants = GetAll().ToArray();
            if (tenants != null)
            {
                return tenants.SingleOrDefault(t => t.Login == login);
            }
            else
            {
                return null;
            }
        }

        public IEnumerable<SecureTenant> GetAll()
        {
            List<SecureTenant> tenants = new List<SecureTenant>();
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Indexes);
            RedisValue[] values = connection.SetMembers(RedisIndexes.AllTenants);
            if (values != null && values.Length > 0)
            {
                connection = _cacheProvider.GetDatabase(RedisTables.Tenant);
                RedisKey[] keys = values.ToStringArray().Select(key => (RedisKey)key).ToArray();
                RedisValue[] jsons = connection.StringGet(keys);
                foreach (RedisValue json in jsons)
                {
                    tenants.Add(JsonConvert.DeserializeObject<SecureTenant>(json));
                }
                return tenants;
            }
            else
            {
                return null;
            }
        }

        public int Create(SecureTenant entity)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Indexes);

            RedisValue[] tenants = connection.SetMembers(RedisIndexes.AllTenants);
            if (tenants != null && tenants.Length > 0)
            {
                int[] tenantIds = Array.ConvertAll(tenants, x => (int)x);
                entity.Id = tenantIds.Max() + 1;
            }
            else
            {
                entity.Id = 1;
            }
            if (connection.SetAdd(RedisIndexes.AllTenants, entity.Id.ToString()))
            {
                connection = _cacheProvider.GetDatabase(RedisTables.Tenant);
                string json = JsonConvert.SerializeObject(entity);
                if (connection.StringSet(entity.Id.ToString(), json))
                {
                    return entity.Id;
                }
                else
                {
                    return -1;
                }
            }
            else
            {
                return -1;
            }
        }

        public bool Update(SecureTenant entity)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Tenant);
            RedisValue value = connection.StringGet(entity.Id.ToString());
            if (value.HasValue)
            {
                string json = JsonConvert.SerializeObject(entity);
                return connection.StringSet(entity.Id.ToString(), json);
            }
            else
            {
                return false;
            }
        }

        public bool Delete(int id)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Tenant);
            if (connection.KeyDelete(id.ToString()))
            {
                connection = _cacheProvider.GetDatabase(RedisTables.TenantUsers);
                if (connection.KeyDelete(id.ToString()))
                {
                    connection = _cacheProvider.GetDatabase(RedisTables.TenantTemplates);
                    if (connection.KeyDelete(id.ToString()))
                    {
                        connection = _cacheProvider.GetDatabase(RedisTables.Indexes);
                        if (connection.SetRemove(RedisIndexes.AllTenants, id.ToString()))
                        {
                            return true;
                        }
                    }
                }

            }
            return false;
        }

        public IEnumerable<TenantPermission> GetAllTenantUsers(int id)
        {
            List<TenantPermission> tenantPermissions = new List<TenantPermission>();
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.TenantUsers);
            HashEntry[] values = connection.HashGetAll(id.ToString());
            if (values != null)
            {
                foreach (HashEntry entry in values)
                {
                    TenantPermission tp = JsonConvert.DeserializeObject<TenantPermission>(entry.Value);
                    tenantPermissions.Add(tp);
                }
                return tenantPermissions;
            }
            else
            {
                return null;
            }
        }

        public IEnumerable<TenantPermission> GetAllUserTenants(string userId)
        {
            List<TenantPermission> tenantPermissions = new List<TenantPermission>();

            IEnumerable<SecureTenant> allTenants = GetAll();
            if (allTenants == null) return null;

            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.TenantUsers);
            foreach (SecureTenant tenant in allTenants)
            {
                RedisValue value = connection.HashGet(tenant.Id.ToString(), userId);
                if (value.HasValue)
                {
                    TenantPermission permission = JsonConvert.DeserializeObject<TenantPermission>(value);
                    tenantPermissions.Add(permission);
                }
            }
            return tenantPermissions;
        }

        public TenantPermission GetTenantUser(int id, string accountId)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.TenantUsers);
            RedisValue value = connection.HashGet(id.ToString(), accountId);
            if (value.HasValue)
            {
                return JsonConvert.DeserializeObject<TenantPermission>(value);
            }
            else
            {
                return null;
            }
        }

        public void SetTenantPermission(TenantPermission permission)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.TenantUsers);
            string json = JsonConvert.SerializeObject(permission);
            HashEntry entry = new HashEntry(permission.AccountId, json);
            connection.HashSet(permission.TenantId.ToString(), new HashEntry[] { entry });
        }

        public bool RemoveTenantPermission(int id, string userId)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.TenantUsers);
            return connection.HashDelete(id.ToString(), userId);
        }

        public IEnumerable<string> GetTenantTemplates(int id)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.TenantTemplates);
            RedisValue[] values = connection.SetMembers(id.ToString());
            if (values != null && values.Length > 0)
            {
                return Array.ConvertAll(values, x => (string)x);
            }
            else
            {
                return null;
            }
        }

        public SecureTenant GetTenantByTemplate(string tid)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Indexes);
            RedisValue[] tenants = connection.SetMembers(RedisIndexes.AllTenants);
            connection = _cacheProvider.GetDatabase(RedisTables.TenantTemplates);
            foreach (RedisValue tenant in tenants)
            {
                if (connection.SetContains(tenant.ToString(), tid))
                {
                    return Get(Int32.Parse(tenant));
                }
            }
            return null;
        }

        public bool AddTenantTemplate(int id, string templateId)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.TenantTemplates);
            return connection.SetAdd(id.ToString(), templateId);
        }

        public bool RemoveTenantTemplate(int id, string templateId)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.TenantTemplates);
            return connection.SetRemove(id.ToString(), templateId);
        }

        public IEnumerable<AddOnFeature> GetTenantFeatures(int id)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Tenant);
            string key = $"{id}_features";
            RedisValue[] values = connection.SetMembers(key);
            if (values != null && values.Length > 0)
            {
                return Array.ConvertAll(values, x => (AddOnFeature)Int32.Parse(x));
            }
            return null;
        }
    }
}