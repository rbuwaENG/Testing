using System;
using Masterloop.Cloud.Storage.Providers;
using System.Collections.Generic;
using System.Linq;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Devices;
using Newtonsoft.Json;
using StackExchange.Redis;
using Masterloop.Cloud.Core.Dashboard;

namespace Masterloop.Cloud.Storage.Repositories
{
    public class DashboardRepository : IDashboardRepository
    {
        protected ICacheProvider _cacheProvider;

        public DashboardRepository(ICacheProvider cacheProvider)
        {
            _cacheProvider = cacheProvider;
        }

        public Dashboard Get(string id)
        {
            throw new NotSupportedException();
        }

        public IEnumerable<Dashboard> GetAll()
        {
            throw new NotSupportedException();
        }

        public IEnumerable<TemplateDashboard> GetAllTemplateDashboards(string tid)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Dashboard);
            RedisValue[] values = connection.SetMembers(tid);
            if (values != null && values.Length > 0)
            {
                string[] dids = Array.ConvertAll(values, x => (string)x);
                if (dids != null)
                {
                    return GetDashboards<TemplateDashboard>(dids);
                }
                else
                {
                    return null;
                }
            }
            else
            {
                return null;
            }
        }

        public TemplateDashboard GetTemplateDashboard(string tid, string did)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Dashboard);
            return GetDashboards<TemplateDashboard>(new string[] { did }).Single();
        }

        public string Create(Dashboard entity)
        {
            throw new NotSupportedException();
        }

        public string CreateTemplateDashboard(string tid, TemplateDashboard entity)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Dashboard);
            string json = JsonConvert.SerializeObject(entity);
            if (connection.StringSet(entity.Id, json))
            {
                if (connection.SetAdd(tid, entity.Id))
                {
                    return entity.Id;
                }
                else
                {
                    return null;
                }
            }
            else
            {
                return null;
            }
        }

        public bool Update(Dashboard entity)
        {
            throw new NotSupportedException();
        }

        public bool UpdateTemplateDashboard(string tid, TemplateDashboard entity)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Dashboard);
            RedisValue value = connection.StringGet(entity.Id);
            if (value.HasValue)
            {
                string json = JsonConvert.SerializeObject(entity);
                return connection.StringSet(entity.Id, json);
            }
            else
            {
                return false;
            }
        }

        public bool Delete(string id)
        {
            throw new NotSupportedException();
        }

        public bool DeleteTemplateDashboard(string tid, string did)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Dashboard);
            RedisValue value = connection.StringGet(did);
            if (value.HasValue)
            {
                if (connection.SetRemove(tid, did))
                {
                    return connection.KeyDelete(did);
                }
                else
                {
                    return false;
                }
            }
            else
            {
                return false;
            }
        }

        private T[] GetDashboards<T>(string[] dids)
        {
            List<RedisKey> cacheKeys = new List<RedisKey>();
            foreach (string did in dids)
            {
                cacheKeys.Add(did);
            }
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Dashboard);
            RedisValue[] values = connection.StringGet(cacheKeys.ToArray());
            List<T> dashboards = new List<T>();
            if (cacheKeys.Count == values.Length)
            {
                for (int i = 0; i < values.Length; i++)
                {
                    RedisKey key = cacheKeys[i];
                    RedisValue value = values[i];
                    if (value.HasValue)
                    {
                        T d = JsonConvert.DeserializeObject<T>(value);
                        dashboards.Add(d);
                    }
                }
            }

            return dashboards.ToArray();
        }
    }
}

