using System;
using System.Collections.Generic;
using Masterloop.Cloud.Storage.Providers;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Devices;
using Newtonsoft.Json;
using StackExchange.Redis;

namespace Masterloop.Cloud.Storage.Repositories
{
    /// <summary>
    /// Repository for templates using Redis Cache.
    /// </summary>
    public class TemplateRepository : ITemplateRepository
    {
        protected ICacheProvider _cacheProvider;

        public TemplateRepository(ICacheProvider cacheProvider)
        {
            _cacheProvider = cacheProvider;
        }

        public DeviceTemplate Get(string id)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Template);
            RedisValue value = connection.StringGet($"{id}");
            if (value.HasValue)
            {
                return JsonConvert.DeserializeObject<DeviceTemplate>(value);
            }
            else
            {
                value = connection.StringGet($"T_{id}");    //TODO: Remove this after migration, then manually delete all with "T_" prefix.
                if (value.HasValue)
                {
                    return JsonConvert.DeserializeObject<DeviceTemplate>(value);
                }
                else
                {
                    return null;
                }
            }
        }

        public IEnumerable<DeviceTemplate> GetAll()
        {
            throw new NotSupportedException();
        }

        public string Create(DeviceTemplate entity)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Template);
            string json = JsonConvert.SerializeObject(entity);
            if (connection.StringSet($"{entity.Id}", json))
            {
                return entity.Id;
            }
            else
            {
                return null;
            }
        }

        public bool Update(DeviceTemplate entity)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Template);
            RedisValue value = connection.StringGet(entity.Id);
            if (value.HasValue)
            {
                string json = JsonConvert.SerializeObject(entity);
                return connection.StringSet($"{entity.Id}", json);
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
    }
}