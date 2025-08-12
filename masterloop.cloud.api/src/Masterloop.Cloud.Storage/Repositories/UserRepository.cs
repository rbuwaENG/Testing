using System.Collections.Generic;
using System.Linq;
using Masterloop.Cloud.Storage.Providers;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Cloud.Core.Security;
using Newtonsoft.Json;
using StackExchange.Redis;

namespace Masterloop.Cloud.Storage.Repositories
{
    /// <summary>
    /// Repository for users using Redis Cache.
    /// </summary>
    public class UserRepository : IUserRepository
    {
        protected ICacheProvider _cacheProvider;

        public UserRepository(ICacheProvider cacheProvider)
        {
            _cacheProvider = cacheProvider;
        }

        public SecureUser Get(string id)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.User);
            RedisValue value = connection.StringGet(id);
            if (value.HasValue)
            {
                return JsonConvert.DeserializeObject<SecureUser>(value);
            }
            else
            {
                return null;
            }
        }

        public IEnumerable<SecureUser> GetAll()
        {
            List<SecureUser> users = new List<SecureUser>();
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Indexes);
            RedisValue[] values = connection.SetMembers(RedisIndexes.AllUsers);
            if (values != null && values.Length > 0)
            {
                connection = _cacheProvider.GetDatabase(RedisTables.User);
                RedisKey[] keys = values.ToStringArray().Select(key => (RedisKey)key).ToArray();
                RedisValue[] jsons = connection.StringGet(keys);
                foreach (RedisValue json in jsons)
                {
                    users.Add(JsonConvert.DeserializeObject<SecureUser>(json));
                }
                return users;
            }
            else
            {
                return null;
            }
        }

        public string Create(SecureUser entity)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.User);
            string json = JsonConvert.SerializeObject(entity);
            if (connection.StringSet(entity.EMail, json))
            {
                connection = _cacheProvider.GetDatabase(RedisTables.Indexes);
                if (connection.SetAdd(RedisIndexes.AllUsers, entity.EMail))
                {
                    return entity.EMail;
                }
            }
            return null;
        }

        public bool Update(SecureUser entity)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.User);
            RedisValue value = connection.StringGet(entity.EMail);
            if (value.HasValue)
            {
                string json = JsonConvert.SerializeObject(entity);
                return connection.StringSet(entity.EMail, json);
            }
            else
            {
                return false;
            }
        }

        public bool Delete(string id)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.User);
            //TODO: Remove TenantUsers records.
            if (connection.KeyDelete(id))
            {
                connection = _cacheProvider.GetDatabase(RedisTables.Indexes);
                return connection.SetRemove(RedisIndexes.AllUsers, id);
            }
            return false;
        }
    }
}