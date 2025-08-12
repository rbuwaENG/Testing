using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.Linq;
using System.Text;
using Dapper;
using Masterloop.Cloud.Core.Observation;
using Masterloop.Cloud.Storage.Providers;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Base;
using Masterloop.Core.Types.Observations;
using Npgsql;
using StackExchange.Redis;

namespace Masterloop.Cloud.Storage.Repositories
{
    /// <summary>
    /// Repository for observations using Redis Cache and TimescaleDB.
    /// </summary>
    public class ObservationRepository : IObservationRepository
    {
        protected ICacheProvider _cacheProvider;
        protected IDbProvider _dbProvider;

        public ObservationRepository(ICacheProvider cacheProvider, IDbProvider dbProvider)
        {
            _cacheProvider = cacheProvider;
            _dbProvider = dbProvider;
        }

        public ExpandedObservationValue GetCurrent(string MID, DataType dataType, int observationId)
        {
            RedisValue value = _cacheProvider.GetDatabase(RedisTables.ObservationCurrent).HashGet(MID, observationId);
            if (value.HasValue)
            {
                string v = value;
                string[] fields = v.Split(new[] { ',' }, 2);
                if (fields.Length == 2)
                {
                    ExpandedObservationValue o = new ExpandedObservationValue()
                    {
                        Id = observationId,
                        Timestamp = DateTime.ParseExact(fields[0], "o", CultureInfo.InvariantCulture).ToUniversalTime(),
                        Value = fields[1],
                        DataType = dataType
                    };
                    return o;
                }
            }
            return null;
        }

        public ExpandedObservationValue[] GetCurrent(string MID, Dictionary<int, DataType> observations)
        {
            HashEntry[] entries = _cacheProvider.GetDatabase(RedisTables.ObservationCurrent).HashGetAll(MID);
            List<ExpandedObservationValue> obs = new List<ExpandedObservationValue>();
            foreach (HashEntry entry in entries)
            {
                if (Int32.TryParse(entry.Name, out int obsId))
                {
                    DataType? dataType = observations.GetValueOrDefault(obsId);
                    if (dataType.HasValue)
                    {
                        string v = entry.Value;
                        string[] fields = v.Split(new[] { ',' }, 2);
                        if (fields.Length == 2)
                        {
                            ExpandedObservationValue o = new ExpandedObservationValue()
                            {
                                Id = obsId,
                                Timestamp = DateTime.ParseExact(fields[0], "o", CultureInfo.InvariantCulture).ToUniversalTime(),
                                Value = fields[1],
                                DataType = dataType.Value
                            };
                            obs.Add(o);
                        }
                    }
                }
            }

            return obs.ToArray();
        }

        public ExpandedObservationValue[] GetHistory(string MID, int observationId, DataType dataType, DateTime from, DateTime to)
        {
            string query = "SELECT time,v_bool,v_dbl,v_int," +
                                   "v_pos_lat,v_pos_lon,v_pos_alt,v_pos_dop,v_str," +
                                   "v_stat_cnt,v_stat_mean,v_stat_min,v_stat_max,v_stat_from,v_stat_to,v_stat_stddev,v_stat_median " +
                           "FROM observation " +
                           "WHERE time>=@from_time AND time<=@to_time AND mid=@mid AND oid=@oid " +
                           "ORDER BY time";
            DynamicParameters prms = new DynamicParameters();
            prms.Add("@mid", MID);
            prms.Add("@oid", observationId);
            prms.Add("@from_time", from);
            prms.Add("@to_time", to);

            List<ExpandedObservationValue> observations = new List<ExpandedObservationValue>();
            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                IDataReader reader = dbConnection.ExecuteReader(query, prms);
                while (reader.Read())
                {
                    Observation o = null;
                    DateTime t = new DateTime(reader.GetDateTime(0).Ticks, DateTimeKind.Utc);
                    switch (dataType)
                    {
                        case DataType.Boolean: o = new BooleanObservation() { Timestamp = t, Value = reader.GetBoolean(1) }; break;
                        case DataType.Double: o = new DoubleObservation() { Timestamp = t, Value = reader.GetDouble(2) }; break;
                        case DataType.Integer: o = new IntegerObservation() { Timestamp = t, Value = reader.GetInt32(3) }; break;
                        case DataType.Position:
                            o = new PositionObservation()
                            {
                                Timestamp = t,
                                Value = new Position()
                                {
                                    Latitude = reader.GetDouble(4),
                                    Longitude = reader.GetDouble(5),
                                    Altitude = reader.IsDBNull(6) ? (double?)null : reader.GetDouble(6),
                                    DOP = reader.IsDBNull(7) ? (double?)null : reader.GetDouble(7),
                                }
                            }; break;
                        case DataType.String: o = new StringObservation() { Timestamp = t, Value = reader.GetString(8) }; break;
                        case DataType.Statistics:
                            o = new StatisticsObservation()
                            {
                                Timestamp = t,
                                Value = new DescriptiveStatistics()
                                {
                                    Count = reader.GetInt32(9),
                                    Mean = reader.GetDouble(10),
                                    Minimum = reader.GetDouble(11),
                                    Maximum = reader.GetDouble(12),
                                    From = reader.IsDBNull(13) ? (DateTime?)null : new DateTime(reader.GetDateTime(13).Ticks, DateTimeKind.Utc),
                                    To = reader.IsDBNull(14) ? (DateTime?)null : new DateTime(reader.GetDateTime(14).Ticks, DateTimeKind.Utc),
                                    StdDev = reader.IsDBNull(15) ? (double?)null : reader.GetDouble(15),
                                    Median = reader.IsDBNull(16) ? (double?)null : reader.GetDouble(16)
                                }
                            };
                            break;
                    }
                    if (o != null)
                    {
                        ExpandedObservationValue esv = new ExpandedObservationValue(observationId, dataType, o);
                        observations.Add(esv);
                    }
                }
                return observations.ToArray();
            }
        }

        public int CreateCurrent(StoredObservation[] observations)
        {
            var groupedObservations = observations.GroupBy(o => o.MID);
            foreach (var groupedObservation in groupedObservations)
            {
                List<HashEntry> entries = new List<HashEntry>();
                foreach (StoredObservation o in groupedObservation)
                {
                    string value = o.Observation.Timestamp.ToUniversalTime().ToString("o") + ",";
                    switch (o.Observation.DataType)
                    {
                        case DataType.Boolean: value += DataTypeStringConverter.FormatBoolean(o.Observation.ToBoolean()); break;
                        case DataType.Double: value += DataTypeStringConverter.FormatDouble(o.Observation.ToDouble()); break;
                        case DataType.Integer: value += DataTypeStringConverter.FormatInteger(o.Observation.ToInteger()); break;
                        case DataType.Position: value += DataTypeStringConverter.FormatPosition(o.Observation.ToPosition()); break;
                        case DataType.String: value += o.Observation.ToString(); break;
                        case DataType.Statistics: value += DataTypeStringConverter.FormatStatistics(o.Observation.ToStatistics()); break;
                    }
                    HashEntry entry = new HashEntry(o.Observation.Id, value);
                    entries.Add(entry);
                }
                _cacheProvider.GetDatabase(RedisTables.ObservationCurrent).HashSet(groupedObservation.Key, entries.ToArray());
            }

            return observations.Length;
        }

        public bool CreateHistory(StoredObservation[] observations, bool batchInsert)
        {
            if (batchInsert)
            {
                return CreateHistoryBatch(observations);
            }
            else
            {
                return CreateHistoryOneByOne(observations);
            }
        }

        private bool CreateHistoryBatch(StoredObservation[] observations)
        {
            StringBuilder query = new StringBuilder();
            DynamicParameters prms = new DynamicParameters();
            AppendObservationInsertHeader(query);

            for (int i = 0; i < observations.Length; i++)
            {
                if (i > 0) query.Append(",");
                AppendObservationInsertRecord(i, observations[i], query, prms);

            }
            query.Append(" ON CONFLICT(time,mid,oid) DO NOTHING;");

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                dbConnection.Execute(query.ToString(), prms);
            }

            return true;
        }

        private bool CreateHistoryOneByOne(StoredObservation[] observations)
        {
            StringBuilder query = new StringBuilder();
            DynamicParameters prms = new DynamicParameters();

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                for (int i = 0; i < observations.Length; i++)
                {
                    query.Clear();
                    AppendObservationInsertHeader(query);
                    AppendObservationInsertRecord(0, observations[i], query, prms);
                    try
                    {
                        if (dbConnection.Execute(query.ToString(), prms) != 1) return false;
                    }
                    catch (Npgsql.PostgresException)
                    {
                    }
                }
            }
            return true;
        }

        private void AppendObservationInsertHeader(StringBuilder query)
        {
            query.Append("INSERT INTO observation (time,mid,oid,created_on,v_bool,v_dbl,v_int," +
                         "v_pos_lat,v_pos_lon,v_pos_alt,v_pos_dop,v_str," +
                         "v_stat_cnt,v_stat_mean,v_stat_min,v_stat_max,v_stat_from,v_stat_to,v_stat_stddev,v_stat_median) VALUES ");
        }

        private void AppendObservationInsertRecord(int i, StoredObservation observation, StringBuilder query, DynamicParameters prms)
        {
            query.Append($"(@{i}_time,@{i}_mid,@{i}_oid,@{i}_created_on," +
                         $"@{i}_v_bool,@{i}_v_dbl,@{i}_v_int,@{i}_v_pos_lat,@{i}_v_pos_lon,@{i}_v_pos_alt,@{i}_v_pos_dop,@{i}_v_str,@{i}_v_stat_cnt,@{i}_v_stat_mean,@{i}_v_stat_min,@{i}_v_stat_max,@{i}_v_stat_from,@{i}_v_stat_to,@{i}_v_stat_stddev,@{i}_v_stat_median)");
            prms.Add($"@{i}_time", observation.Observation.Timestamp.ToUniversalTime());
            prms.Add($"@{i}_mid", observation.MID);
            prms.Add($"@{i}_oid", observation.Observation.Id);
            prms.Add($"@{i}_created_on", DateTime.UtcNow);
            DataType dataType = observation.Observation.DataType;

            if (dataType == DataType.Boolean)
            {
                prms.Add($"@{i}_v_bool", observation.Observation.ToBoolean());
            }
            else
            {
                prms.Add($"@{i}_v_bool", null);
            }

            if (dataType == DataType.Double)
            {
                prms.Add($"@{i}_v_dbl", observation.Observation.ToDouble());
            }
            else
            {
                prms.Add($"@{i}_v_dbl", null);
            }

            if (dataType == DataType.Integer)
            {
                prms.Add($"@{i}_v_int", observation.Observation.ToInteger());
            }
            else
            {
                prms.Add($"@{i}_v_int", null);
            }

            if (dataType == DataType.Position)
            {
                Position pos = observation.Observation.ToPosition();
                prms.Add($"@{i}_v_pos_lat", pos.Latitude);
                prms.Add($"@{i}_v_pos_lon", pos.Longitude);
                prms.Add($"@{i}_v_pos_alt", pos.Altitude);
                prms.Add($"@{i}_v_pos_dop", pos.DOP);
            }
            else
            {
                prms.Add($"@{i}_v_pos_lat", null);
                prms.Add($"@{i}_v_pos_lon", null);
                prms.Add($"@{i}_v_pos_alt", null);
                prms.Add($"@{i}_v_pos_dop", null);
            }

            if (dataType == DataType.String)
            {
                prms.Add($"@{i}_v_str", observation.Observation.ToString(), null, null, 4096);
            }
            else
            {
                prms.Add($"@{i}_v_str", null);
            }

            if (dataType == DataType.Statistics)
            {
                DescriptiveStatistics stat = observation.Observation.ToStatistics();
                prms.Add($"@{i}_v_stat_cnt", stat.Count);
                prms.Add($"@{i}_v_stat_mean", stat.Mean);
                prms.Add($"@{i}_v_stat_min", stat.Minimum);
                prms.Add($"@{i}_v_stat_max", stat.Maximum);
                prms.Add($"@{i}_v_stat_from", stat.From.HasValue ? stat.From : null);
                prms.Add($"@{i}_v_stat_to", stat.To.HasValue ? stat.To : null);
                prms.Add($"@{i}_v_stat_stddev", stat.StdDev.HasValue ? stat.StdDev : null);
                prms.Add($"@{i}_v_stat_median", stat.Median.HasValue ? stat.Median : null);
            }
            else
            {
                prms.Add($"@{i}_v_stat_cnt", null);
                prms.Add($"@{i}_v_stat_mean", null);
                prms.Add($"@{i}_v_stat_min", null);
                prms.Add($"@{i}_v_stat_max", null);
                prms.Add($"@{i}_v_stat_from", null);
                prms.Add($"@{i}_v_stat_to", null);
                prms.Add($"@{i}_v_stat_stddev", null);
                prms.Add($"@{i}_v_stat_median", null);
            }
        }

        public int DeleteHistory(string MID, int observationId, DateTime from, DateTime to)
        {
            string query = "DELETE FROM observation " +
                           "WHERE time>=@from_time AND time<=@to_time AND mid=@mid AND oid=@oid";
            DynamicParameters prms = new DynamicParameters();
            prms.Add("@mid", MID);
            prms.Add("@oid", observationId);
            prms.Add("@from_time", from);
            prms.Add("@to_time", to);

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                return dbConnection.Execute(query, prms);
            }
        }

        public int DeleteHistory(string MID)
        {
            string query = "DELETE FROM observation " +
                           "WHERE mid=@mid";
            DynamicParameters prms = new DynamicParameters();
            prms.Add("@mid", MID);

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                return dbConnection.Execute(query, prms);
            }
        }

        public bool DeleteCurrent(string MID, int observationId)
        {
            return _cacheProvider.GetDatabase(RedisTables.ObservationCurrent).HashDelete(MID, observationId);
        }

        public bool DeleteCurrent(string MID)
        {
            return _cacheProvider.GetDatabase(RedisTables.ObservationCurrent).KeyDelete(MID);
        }
    }
}