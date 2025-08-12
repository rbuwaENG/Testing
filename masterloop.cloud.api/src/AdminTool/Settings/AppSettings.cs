using System;
using System.Diagnostics;
using Microsoft.Extensions.Configuration;

namespace Masterloop.Tools.AdminTool.Settings
{
    public class AppSettings
    {
        public string NLogConfigFile { get; }
        public string MasterloopMigrationSourceHostname { get; }
        public string MasterloopMigrationSourceUsername { get; }
        public string MasterloopMigrationSourcePassword { get; }
        public string MasterloopTargetHostname { get; }
        public string MasterloopTargetUsername { get; }
        public string MasterloopTargetPassword { get; }
        public string RabbitMQConnectionString { get; }
        public string RedisConnectionString { get; }
        public string PostgreSQLConnectionString { get; }

        public AppSettings(IConfiguration configuration)
        {
            try
            {
                NLogConfigFile = configuration.GetSection("General:NLogConfigFile").Value;
                MasterloopMigrationSourceHostname = configuration.GetSection("MasterloopMigrationSource:Hostname").Value;
                MasterloopMigrationSourceUsername = configuration.GetSection("MasterloopMigrationSource:Username").Value;
                MasterloopMigrationSourcePassword = configuration.GetSection("MasterloopMigrationSource:Password").Value;
                MasterloopTargetHostname = configuration.GetSection("MasterloopTarget:Hostname").Value;
                MasterloopTargetUsername = configuration.GetSection("MasterloopTarget:Username").Value;
                MasterloopTargetPassword = configuration.GetSection("MasterloopTarget:Password").Value;
                RabbitMQConnectionString = configuration.GetSection("RabbitMQ:ConnectionString").Value;
                RedisConnectionString = configuration.GetSection("Redis:ConnectionString").Value;
                PostgreSQLConnectionString = configuration.GetSection("PostgreSQL:ConnectionString").Value;
            }
            catch (Exception e)
            {
                Trace.TraceError($"Setting error: {e.Message}");
                throw;
            }
        }
    }
}