using System;
using System.Collections.Generic;
using Masterloop.Core.Types.Devices;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Cloud.Storage.Providers;
using StackExchange.Redis;
using Newtonsoft.Json;

namespace Masterloop.Cloud.Storage.Repositories
{
    /// <summary>
    /// Repository for devices using Redis Cache.
    /// </summary>
    public class DeviceRepository : IDeviceRepository
    {
        protected ICacheProvider _cacheProvider;

        public DeviceRepository(ICacheProvider cacheProvider)
        {
            _cacheProvider = cacheProvider;
        }

        public SecureDetailedDevice Get(string id)
        {
            SecureDetailedDevice[] devices = GetDevices<SecureDetailedDevice>(new string[] { id });
            if (devices != null && devices.Length == 1)
            {
                return devices[0];
            }
            else
            {
                return null;
            }
        }

        public SecureDetailedDevice[] Get(string[] ids)
        {
            SecureDetailedDevice[] devices = GetDevices<SecureDetailedDevice>(ids);
            if (devices != null && devices.Length > 0)
            {
                return devices;
            }
            else
            {
                return null;
            }
        }

        public IEnumerable<SecureDetailedDevice> GetByTemplate(string tid)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.TemplateDevices);
            RedisValue[] values = connection.SetMembers(tid);
            if (values != null && values.Length > 0)
            {
                string[] mids = Array.ConvertAll(values, x => (string)x);
                if (mids != null)
                {
                    return GetDevices<SecureDetailedDevice>(mids);
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

        public IEnumerable<string> GetMIDsByTemplate(string tid)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.TemplateDevices);
            RedisValue[] values = connection.SetMembers(tid);
            if (values != null && values.Length > 0)
            {
                string[] mids = Array.ConvertAll(values, x => (string)x);
                if (mids != null)
                {
                    return mids;
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

        public IEnumerable<SecureDetailedDevice> GetAll()
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Indexes);
            RedisValue[] values = connection.SetMembers(RedisIndexes.AllDevices);
            if (values != null && values.Length > 0)
            {
                string[] mids = Array.ConvertAll(values, x => (string)x);
                if (mids != null)
                {
                    return GetDevices<SecureDetailedDevice>(mids);
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

        public string Create(SecureDetailedDevice entity)
        {
            entity.Metadata = null;
            entity.LatestPulse = null;
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Device);
            string json = JsonConvert.SerializeObject(entity);
            if (connection.StringSet(entity.MID, json))
            {
                connection = _cacheProvider.GetDatabase(RedisTables.Indexes);
                AddToTemplateDevices(entity.TemplateId, entity.MID);
                connection.SetAdd(RedisIndexes.AllDevices, entity.MID);
                return entity.MID;
            }
            return null;
        }

        public bool Update(SecureDetailedDevice entity)
        {
            entity.Metadata = null;
            entity.LatestPulse = null;
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Device);
            RedisValue value = connection.StringGet(entity.MID);
            if (value.HasValue)
            {
                SecureDetailedDevice oldEntity = JsonConvert.DeserializeObject<SecureDetailedDevice>(value);

                // Handle change template
                if (entity.TemplateId != oldEntity.TemplateId)
                {
                    RemoveFromTemplateDevices(oldEntity.TemplateId, entity.MID);
                    AddToTemplateDevices(entity.TemplateId, entity.MID);
                }

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
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Device);
            RedisValue value = connection.StringGet(id);
            if (value.HasValue)
            {
                SecureDetailedDevice oldEntity = JsonConvert.DeserializeObject<SecureDetailedDevice>(value);
                RemoveFromTemplateDevices(oldEntity.TemplateId, id);
                connection = _cacheProvider.GetDatabase(RedisTables.Indexes);
                connection.SetRemove(RedisIndexes.AllDevices, id);
                connection = _cacheProvider.GetDatabase(RedisTables.Device);
                return connection.KeyDelete(id);
            }
            else
            {
                return false;
            }
        }

        private bool AddToTemplateDevices(string tid, string mid)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.TemplateDevices);
            return connection.SetAdd(tid, mid);
        }

        private bool RemoveFromTemplateDevices(string tid, string mid)
        {
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.TemplateDevices);
            return connection.SetRemove(tid, mid);
        }

        private T[] GetDevices<T>(string[] mids)
        {
            List<RedisKey> cacheKeys = new List<RedisKey>();
            foreach (string mid in mids)
            {
                cacheKeys.Add(mid);
            }
            IDatabase connection = _cacheProvider.GetDatabase(RedisTables.Device);
            RedisValue[] values = connection.StringGet(cacheKeys.ToArray());
            List<T> devices = new List<T>();
            if (cacheKeys.Count == values.Length)
            {
                for (int i = 0; i < values.Length; i++)
                {
                    RedisKey key = cacheKeys[i];
                    RedisValue value = values[i];
                    if (value.HasValue)
                    {
                        T d = JsonConvert.DeserializeObject<T>(value);
                        devices.Add(d);
                    }
                }
            }

            return devices.ToArray();
        }
    }
}