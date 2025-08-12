using System;
using System.Collections.Generic;
using Masterloop.Cloud.Core.Node;
using Masterloop.Cloud.Storage.Providers;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Newtonsoft.Json;
using StackExchange.Redis;

namespace Masterloop.Cloud.Storage.Repositories
{
    public class NodeRepository : INodeRepository
    {
        protected ICacheProvider _cacheProvider;

        public NodeRepository(ICacheProvider cacheProvider)
        {
            _cacheProvider = cacheProvider;
        }

        public NodeConfiguration Get(string id)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.NodeConfigs);
            RedisValue value = connection.StringGet("DEFAULT");  //TODO: Use actual id.
            if (value.HasValue)
            {
                return JsonConvert.DeserializeObject<DeviceNodeConfiguration>(value);
            }
            else
            {
                return null;
            }
        }

        public IEnumerable<NodeConfiguration> GetAll()
        {
            throw new NotImplementedException();
        }

        public string Create(NodeConfiguration entity)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.NodeConfigs);
            string json = JsonConvert.SerializeObject(entity);
            if (connection.StringSet(entity.Id, json))
            {
                return entity.Id;
            }
            return null;
        }

        public bool Update(NodeConfiguration entity)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.NodeConfigs);
            string json = JsonConvert.SerializeObject(entity);
            return connection.StringSet(entity.Id, json);
        }

        public bool Delete(string id)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.NodeConfigs);
            RedisValue value = connection.StringGet(id);
            if (value.HasValue)
            {
                return connection.KeyDelete(id);
            }
            else
            {
                return false;
            }
        }
    }
}
