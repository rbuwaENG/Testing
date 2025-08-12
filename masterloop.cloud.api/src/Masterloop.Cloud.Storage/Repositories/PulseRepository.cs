using System;
using System.Collections.Generic;
using System.Data;
using Dapper;
using Masterloop.Cloud.Core.Pulse;
using Masterloop.Cloud.Storage.Providers;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Pulse;
using Newtonsoft.Json;
using StackExchange.Redis;

namespace Masterloop.Cloud.Storage.Repositories
{
    /// <summary>
    /// Repository for pulses using Redis Cache and TimescaleDB.
    /// </summary>
    public class PulseRepository : IPulseRepository
    {
        protected ICacheProvider _cacheProvider;
        protected IDbProvider _dbProvider;

        public PulseRepository(ICacheProvider cacheProvider, IDbProvider dbProvider)
        {
            _cacheProvider = cacheProvider;
            _dbProvider = dbProvider;
        }

        public DetailedPulsePeriod GetCurrent(string MID, int pulseId)
        {
            RedisValue value = _cacheProvider.GetDatabase(RedisTables.Pulse).HashGet(MID, pulseId);
            if (value.HasValue)
            {
                DetailedPulsePeriod period = JsonConvert.DeserializeObject<DetailedPulsePeriod>(value.ToString());
                period.Id = pulseId;
                period.MID = MID;
                return period;
            }
            else
            {
                return null;
            }
        }

        public IEnumerable<DetailedPulsePeriod> GetCurrent(string[] MIDs, int pulseId)
        {
            List<DetailedPulsePeriod> pulsePeriods = new List<DetailedPulsePeriod>();

            foreach (string MID in MIDs)
            {
                RedisValue value = _cacheProvider.GetDatabase(RedisTables.Pulse).HashGet(MID, pulseId.ToString());
                if (value.HasValue)
                {
                    DetailedPulsePeriod period = JsonConvert.DeserializeObject<DetailedPulsePeriod>(value.ToString());
                    period.Id = pulseId;
                    period.MID = MID;
                    pulsePeriods.Add(period);
                }
            }
            return pulsePeriods;
        }

        public IEnumerable<PulsePeriod> GetHistory(string MID, int pulseId, DateTime from, DateTime to)
        {
            List<PulsePeriod> pulsePeriods = new List<PulsePeriod>();

            string query = "SELECT time,to_time,count " +
                           "FROM pulse " +
                           "WHERE mid=@mid AND pid=@pid AND time>=@from_time AND to_time<=@to_time " +
                           "ORDER BY time";
            DynamicParameters prms = new DynamicParameters();
            prms.Add("@mid", MID);
            prms.Add("@pid", pulseId);
            prms.Add("@from_time", from);
            prms.Add("@to_time", to);

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                using (IDataReader reader = dbConnection.ExecuteReader(query, prms))
                {
                    while (reader.Read())
                    {
                        PulsePeriod pulsePeriod = new PulsePeriod()
                        {
                            From = new DateTime(reader.GetDateTime(0).Ticks, DateTimeKind.Utc),
                            To = new DateTime(reader.GetDateTime(1).Ticks, DateTimeKind.Utc),
                            PulseCount = reader.GetInt32(2)
                        };
                        pulsePeriods.Add(pulsePeriod);
                    }
                }
            }
            return pulsePeriods;
        }

        public bool UpdateCurrent(DetailedPulsePeriod pulsePeriod)
        {
            PulsePeriod storedPulse = new PulsePeriod()
            {
                From = pulsePeriod.From,
                To = pulsePeriod.To,
                PulseCount = pulsePeriod.PulseCount
            };
            string cacheValue = JsonConvert.SerializeObject(storedPulse);
            return _cacheProvider.GetDatabase(RedisTables.Pulse).HashSet(pulsePeriod.MID, pulsePeriod.Id, cacheValue);
        }

        public bool CreateCurrent(DetailedPulsePeriod pulsePeriod)
        {
            return UpdateCurrent(pulsePeriod);
        }

        public bool CreateHistory(DetailedPulsePeriod pulsePeriod)
        {
            DynamicParameters prms = new DynamicParameters();
            string query = "INSERT INTO pulse(time,mid,pid,to_time,created_on,count) " +
                           "VALUES(@time,@mid,@pid,@to_time,@created_on,@count) " +
                           "ON CONFLICT(time,mid,pid) DO NOTHING;";
            prms.Add("@time", pulsePeriod.From);
            prms.Add("@mid", pulsePeriod.MID);
            prms.Add("@pid", pulsePeriod.Id);
            prms.Add("@to_time", pulsePeriod.To);
            prms.Add("@created_on", DateTime.UtcNow);
            prms.Add("@count", pulsePeriod.PulseCount);

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                dbConnection.Execute(query, prms);
            }
            return true;
        }
    }
}