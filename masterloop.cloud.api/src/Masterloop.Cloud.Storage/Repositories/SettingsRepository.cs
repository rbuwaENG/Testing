using System;
using System.Collections.Generic;
using Masterloop.Cloud.Storage.Providers;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Settings;
using Newtonsoft.Json;
using StackExchange.Redis;

namespace Masterloop.Cloud.Storage.Repositories
{
    /// <summary>
    /// Repository for overridden, device specific settings using Redis Cache.
    /// Note: Template level settings are stored with the template.
    /// </summary>
    public class SettingsRepository : ISettingsRepository
    {
        protected ICacheProvider _cacheProvider;

        public SettingsRepository(ICacheProvider cacheProvider)
        {
            _cacheProvider = cacheProvider;
        }

        public SettingsPackage Get(string id)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Settings);
            RedisValue value = connection.StringGet(id);
            if (value.HasValue)
            {
                return JsonConvert.DeserializeObject<SettingsPackage>(value);
            }
            else
            {
                return null;
            }
        }

        public IEnumerable<SettingsPackage> GetAll()
        {
            throw new NotSupportedException();
        }

        public string Create(SettingsPackage entity)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Settings);
            string json = JsonConvert.SerializeObject(entity);
            if (connection.StringSet(entity.MID, json))
            {
                return entity.MID;
            }
            else
            {
                return null;
            }
        }

        public bool Update(SettingsPackage entity)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Settings);
            RedisValue value = connection.StringGet(entity.MID);
            if (value.HasValue)
            {
                string json = JsonConvert.SerializeObject(entity);
                return connection.StringSet(entity.MID, json);
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