using System;
using System.Collections.Generic;
using System.Data;
using Dapper;
using Masterloop.Cloud.Storage.Providers;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Commands;
using Newtonsoft.Json;

namespace Masterloop.Cloud.Storage.Repositories
{
    /// <summary>
    /// Repository for command history using TimescaleDB.
    /// </summary>
    public class CommandRepository : ICommandRepository
    {
        protected IDbProvider _dbProvider;

        public CommandRepository(IDbProvider dbProvider)
        {
            _dbProvider = dbProvider;
        }

        public bool Create(string MID, CommandHistory command)
        {
            Tuple<string, CommandHistory> cmd = new Tuple<string, CommandHistory>(MID, command);
            return Create(new Tuple<string, CommandHistory>[] { cmd }) == 1;
        }

        public int Create(Tuple<string, CommandHistory>[] commands)
        {
            DynamicParameters prms = new DynamicParameters();
            string query = "INSERT INTO command(time,mid,cid,created_on,expires_at,arguments,delivered_at,was_accepted,origin_app,origin_acnt,origin_addr,origin_ref,result_code,comment) VALUES ";

            for (int i = 0; i < commands.Length; i++)
            {
                CommandHistory command = commands[i].Item2;
                query += $"(@{i}_time,@{i}_mid,@{i}_cid,@{i}_created_on,@{i}_expires_at,@{i}_arguments,@{i}_delivered_at,@{i}_was_accepted," +
                         $"@{i}_origin_app,@{i}_origin_acnt,@{i}_origin_addr,@{i}_origin_ref,@{i}_result_code,@{i}_comment)";
                prms.Add($"@{i}_time", command.Timestamp);
                prms.Add($"@{i}_mid", commands[i].Item1);
                prms.Add($"@{i}_cid", command.Id);
                prms.Add($"@{i}_created_on", DateTime.UtcNow);
                prms.Add($"@{i}_expires_at", command.ExpiresAt.HasValue ? command.ExpiresAt : null);
                prms.Add($"@{i}_arguments", (command.Arguments != null && command.Arguments.Length > 0) ? JsonConvert.SerializeObject(command.Arguments) : null );
                prms.Add($"@{i}_delivered_at", command.DeliveredAt.HasValue ? command.DeliveredAt.Value : (DateTime?)null);
                prms.Add($"@{i}_was_accepted", command.WasAccepted.HasValue ? command.WasAccepted.Value : (bool?)null);
                prms.Add($"@{i}_origin_app", !string.IsNullOrEmpty(command.OriginApplication) ? command.OriginApplication : null);
                prms.Add($"@{i}_origin_acnt", !string.IsNullOrEmpty(command.OriginAccount) ? command.OriginAccount : null);
                prms.Add($"@{i}_origin_addr", !string.IsNullOrEmpty(command.OriginAddress) ? command.OriginAddress : null);
                prms.Add($"@{i}_origin_ref", !string.IsNullOrEmpty(command.OriginReference) ? command.OriginReference : null);
                prms.Add($"@{i}_result_code", command.ResultCode.HasValue ? command.ResultCode.Value : (int?)null);
                prms.Add($"@{i}_comment", !string.IsNullOrEmpty(command.Comment) ? command.Comment : null);
            }
            query += " ON CONFLICT(time,mid,cid) DO NOTHING;";

            lock (_dbProvider)
            {
                using (IDbConnection dbConnection = _dbProvider.GetConnection())
                {
                    dbConnection.Open();
                    return dbConnection.Execute(query, prms);
                }
            }
        }

        public CommandHistory Get(string MID, int commandId, DateTime timestamp)
        {
            string query = "SELECT time,created_on,expires_at,arguments,delivered_at,was_accepted,origin_app,origin_acnt,origin_addr,origin_ref,result_code,comment " +
                           "FROM command " +
                           "WHERE time=@time AND mid=@mid AND cid=@cid " +
                           "ORDER BY time";
            DynamicParameters prms = new DynamicParameters();
            prms.Add("@time", timestamp);
            prms.Add("@mid", MID);
            prms.Add("@cid", commandId);

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                using (IDataReader reader = dbConnection.ExecuteReader(query, prms))
                {
                    if (reader.Read())
                    {
                        CommandHistory command = new CommandHistory()
                        {
                            Timestamp = new DateTime(reader.GetDateTime(0).Ticks, DateTimeKind.Utc),
                            Id = commandId,
                            CreatedOn = new DateTime(reader.GetDateTime(1).Ticks, DateTimeKind.Utc),
                            ExpiresAt = reader.IsDBNull(2) ? (DateTime?)null : new DateTime(reader.GetDateTime(2).Ticks, DateTimeKind.Utc),
                            Arguments = reader.IsDBNull(3) ? null : JsonConvert.DeserializeObject<CommandArgument[]>(reader.GetString(3)),
                            DeliveredAt = reader.IsDBNull(4) ? (DateTime?)null : new DateTime(reader.GetDateTime(4).Ticks, DateTimeKind.Utc),
                            WasAccepted = reader.IsDBNull(5) ? (bool?)null : reader.GetBoolean(5),
                            OriginApplication = reader.IsDBNull(6) ? null : reader.GetString(6),
                            OriginAccount = reader.IsDBNull(7) ? null : reader.GetString(7),
                            OriginAddress = reader.IsDBNull(8) ? null : reader.GetString(8),
                            OriginReference = reader.IsDBNull(9) ? null : reader.GetString(9),
                            ResultCode = reader.IsDBNull(10) ? (int?)null : reader.GetInt32(10),
                            Comment = reader.IsDBNull(11) ? null : reader.GetString(11)
                        };
                        return command;
                    }
                    else
                    {
                        return null;
                    }
                }
            }
        }

        public IEnumerable<CommandHistory> Get(string MID, DateTime from, DateTime to)
        {
            string query = "SELECT time,cid,created_on,expires_at,arguments,delivered_at,was_accepted,origin_app,origin_acnt,origin_addr,origin_ref,result_code,comment " +
                           "FROM command " +
                           "WHERE time>=@from_time AND time<=@to_time AND mid=@mid " +
                           "ORDER BY time,cid";
            DynamicParameters prms = new DynamicParameters();
            prms.Add("@from_time", from);
            prms.Add("@to_time", to);
            prms.Add("@mid", MID);

            List<CommandHistory> commands = new List<CommandHistory>();
            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                using (IDataReader reader = dbConnection.ExecuteReader(query, prms))
                {
                    while (reader.Read())
                    {
                        CommandHistory command = new CommandHistory()
                        {
                            Timestamp = new DateTime(reader.GetDateTime(0).Ticks, DateTimeKind.Utc),
                            Id = reader.GetInt32(1),
                            CreatedOn = new DateTime(reader.GetDateTime(2).Ticks, DateTimeKind.Utc),
                            ExpiresAt = reader.IsDBNull(3) ? (DateTime?)null : new DateTime(reader.GetDateTime(3).Ticks, DateTimeKind.Utc),
                            Arguments = reader.IsDBNull(4) ? null : JsonConvert.DeserializeObject<CommandArgument[]>(reader.GetString(4)),
                            DeliveredAt = reader.IsDBNull(5) ? (DateTime?)null : new DateTime(reader.GetDateTime(5).Ticks, DateTimeKind.Utc),
                            WasAccepted = reader.IsDBNull(6) ? (bool?)null : reader.GetBoolean(6),
                            OriginApplication = reader.IsDBNull(7) ? null : reader.GetString(7),
                            OriginAccount = reader.IsDBNull(8) ? null : reader.GetString(8),
                            OriginAddress = reader.IsDBNull(9) ? null : reader.GetString(9),
                            OriginReference = reader.IsDBNull(10) ? null : reader.GetString(10),
                            ResultCode = reader.IsDBNull(11) ? (int?)null : reader.GetInt32(11),
                            Comment = reader.IsDBNull(12) ? null : reader.GetString(12)
                        };
                        commands.Add(command);
                    }
                }
                return commands.ToArray();
            }
        }

        public bool Update(string MID, CommandResponse command)
        {
            Tuple<string, CommandResponse> cmd = new Tuple<string, CommandResponse>(MID, command);
            return Update(new Tuple<string, CommandResponse>[] { cmd });
        }

        public bool Update(Tuple<string, CommandResponse>[] commands)
        {
            DynamicParameters prms = new DynamicParameters();
            string query = "";
            for (int i = 0; i < commands.Length; i++)
            {
                CommandResponse command = commands[i].Item2;
                query += $"UPDATE command " +
                         $"SET delivered_at=@{i}_delivered_at,response_received_at=@{i}_response_received_at,was_accepted=@{i}_was_accepted,result_code=@{i}_result_code,comment=@{i}_comment " +
                         $"WHERE time=@{i}_time AND mid=@{i}_mid AND cid=@{i}_cid; ";
                prms.Add($"@{i}_time", command.Timestamp);
                prms.Add($"@{i}_mid", commands[i].Item1);
                prms.Add($"@{i}_cid", command.Id);
                prms.Add($"@{i}_delivered_at", command.DeliveredAt.HasValue ? command.DeliveredAt.Value : (DateTime?)null);
                prms.Add($"@{i}_response_received_at", DateTime.UtcNow);
                prms.Add($"@{i}_was_accepted", command.WasAccepted);
                prms.Add($"@{i}_result_code", command.ResultCode.HasValue ? command.ResultCode.Value : (int?)null);
                prms.Add($"@{i}_comment", !string.IsNullOrEmpty(command.Comment) ? command.Comment : null);
            }

            lock (_dbProvider)
            {
                lock (_dbProvider)
                {
                    using (IDbConnection dbConnection = _dbProvider.GetConnection())
                    {
                        dbConnection.Open();
                        return dbConnection.Execute(query, prms) == 1;
                    }
                }
            }
        }
    }
}