using System;
using System.Collections.Generic;
using System.Data;
using Dapper;
using Masterloop.Cloud.Storage.Providers;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.EventLog;

namespace Masterloop.Cloud.Storage.Repositories
{
    /// <summary>
    /// Repository for event logs using TimescaleDB.
    /// </summary>
    public class EventLogRepository : IEventLogRepository
    {
        protected IDbProvider _dbProvider;

        public EventLogRepository(IDbProvider dbProvider)
        {
            _dbProvider = dbProvider;
        }

        public bool Create(SystemEvent systemEvent)
        {
            DynamicParameters prms = new DynamicParameters();
            string query = "INSERT INTO system_event(time,category,created_on,title,body) " +
                           "VALUES(@time,@category,@created_on,@title,@body) " +
                           "ON CONFLICT(time,category) DO NOTHING;";
            prms.Add("@time", systemEvent.Timestamp);
            prms.Add("@category", systemEvent.Category);
            prms.Add("@created_on", DateTime.UtcNow);
            prms.Add("@title", systemEvent.Title, null, null, 64);
            prms.Add("@body", systemEvent.Body, null, null, 1024);

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                dbConnection.Execute(query, prms);
            }
            return true;
        }

        public bool Create(string MID, DeviceEvent deviceEvent)
        {
            DynamicParameters prms = new DynamicParameters();
            string query = "INSERT INTO device_event(time,mid,category,created_on,title,body,from_device) " +
                           "VALUES(@time,@mid,@category,@created_on,@title,@body,@from_device) " +
                           "ON CONFLICT(time,mid,category) DO NOTHING;";
            prms.Add("@time", deviceEvent.Timestamp);
            prms.Add("@mid", MID);
            prms.Add("@category", deviceEvent.Category);
            prms.Add("@created_on", DateTime.UtcNow);
            prms.Add("@title", deviceEvent.Title, null, null, 64);
            prms.Add("@body", deviceEvent.Body, null, null, 1024);
            prms.Add("@from_device", deviceEvent.ReceivedFromDevice);

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                dbConnection.Execute(query, prms);
            }
            return true;
        }

        public bool Create(string userId, UserEvent userEvent)
        {
            DynamicParameters prms = new DynamicParameters();
            string query = "INSERT INTO user_event(time,uid,category,created_on,title,body) " +
                           "VALUES(@time,@uid,@category,@created_on,@title,@body) " +
                           "ON CONFLICT(time,uid,category) DO NOTHING;";
            prms.Add("@time", userEvent.Timestamp);
            prms.Add("@uid", userId);
            prms.Add("@category", userEvent.Category);
            prms.Add("@created_on", DateTime.UtcNow);
            prms.Add("@title", userEvent.Title, null, null, 64);
            prms.Add("@body", userEvent.Body, null, null, 1024);

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                dbConnection.Execute(query, prms);
            }
            return true;
        }

        public IEnumerable<SystemEvent> GetSystemEvents(DateTime from, DateTime to)
        {
            List<SystemEvent> systemEvents = new List<SystemEvent>();

            string query = "SELECT time,category,title,body " +
                           "FROM system_event " +
                           "WHERE time>=@from_time AND time<=@to_time " +
                           "ORDER BY time";
            DynamicParameters prms = new DynamicParameters();
            prms.Add("@from_time", from);
            prms.Add("@to_time", to);

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                using (IDataReader reader = dbConnection.ExecuteReader(query, prms))
                {
                    while (reader.Read())
                    {
                        SystemEvent systemEvent = new SystemEvent()
                        {
                            Timestamp = new DateTime(reader.GetDateTime(0).Ticks, DateTimeKind.Utc),
                            Category = (EventCategoryType)reader.GetInt32(1),
                            Title = reader.IsDBNull(2) ? null : reader.GetString(2),
                            Body = reader.IsDBNull(3) ? null : reader.GetString(3)
                        };
                        systemEvents.Add(systemEvent);
                    }
                }
            }
            return systemEvents;
        }

        public IEnumerable<DeviceEvent> GetDeviceEvents(string MID, DateTime from, DateTime to)
        {
            List<DeviceEvent> deviceEvents = new List<DeviceEvent>();

            string query = "SELECT time,category,title,body,from_device " +
                           "FROM device_event " +
                           "WHERE time>=@from_time AND time<=@to_time AND mid=@mid " +
                           "ORDER BY time";
            DynamicParameters prms = new DynamicParameters();
            prms.Add("@from_time", from);
            prms.Add("@to_time", to);
            prms.Add("@mid", MID);

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                using (IDataReader reader = dbConnection.ExecuteReader(query, prms))
                {
                    while (reader.Read())
                    {
                        DeviceEvent deviceEvent = new DeviceEvent()
                        {
                            Timestamp = new DateTime(reader.GetDateTime(0).Ticks, DateTimeKind.Utc),
                            Category = (EventCategoryType)reader.GetInt32(1),
                            Title = reader.IsDBNull(2) ? null : reader.GetString(2),
                            Body = reader.IsDBNull(3) ? null : reader.GetString(3),
                            ReceivedFromDevice = reader.GetBoolean(4)
                        };
                        deviceEvents.Add(deviceEvent);
                    }
                }
            }
            return deviceEvents;
        }

        public IEnumerable<UserEvent> GetUserEvents(string userId, DateTime from, DateTime to)
        {
            List<UserEvent> userEvents = new List<UserEvent>();

            string query = "SELECT time,category,title,body " +
                           "FROM user_event " +
                           "WHERE time>=@from_time AND time<=@to_time AND uid=@uid " +
                           "ORDER BY time";
            DynamicParameters prms = new DynamicParameters();
            prms.Add("@from_time", from);
            prms.Add("@to_time", to);
            prms.Add("@uid", userId);

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                using (IDataReader reader = dbConnection.ExecuteReader(query, prms))
                {
                    while (reader.Read())
                    {
                        UserEvent userEvent = new UserEvent()
                        {
                            Timestamp = new DateTime(reader.GetDateTime(0).Ticks, DateTimeKind.Utc),
                            Category = (EventCategoryType)reader.GetInt32(1),
                            Title = reader.IsDBNull(2) ? null : reader.GetString(2),
                            Body = reader.IsDBNull(3) ? null : reader.GetString(3)
                        };
                        userEvents.Add(userEvent);
                    }
                }
            }
            return userEvents;
        }
    }
}