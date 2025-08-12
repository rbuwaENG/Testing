using System;
using Microsoft.Extensions.Configuration;
using System.Diagnostics;
using Masterloop.Cloud.TwinWorker.Consumers;

namespace Masterloop.Cloud.TwinWorker.Settings
{
    public class AppSettings
    {
        public ConsumerType Consumer { get; }
        public string NLogConfigFile { get; }
        public int Threads { get; }
        public int BatchSize { get; }

        public string RMQConnectionString { get; }
        public string RMQQueueName { get; }
        public int RMQPrefetchCount { get; }

        public string PostgreSQLConnectionString { get; }

        public string RedisConnectionString { get; }

        public AppSettings(IConfiguration configuration)
        {
            try
            {

                // General
                Consumer = (ConsumerType)Enum.Parse(typeof(ConsumerType), configuration.GetSection("General:ConsumerType").Value);
                Trace.TraceInformation($"General:ConsumerType={Consumer}");

                NLogConfigFile = configuration.GetSection("General:NLogConfigFile").Value;
                Trace.TraceInformation($"General:NLogConfigFile={NLogConfigFile}");

                Threads = Int32.Parse(configuration.GetSection("General:Threads").Value);
                Trace.TraceInformation($"General:Threads={Threads}");

                BatchSize = Int32.Parse(configuration.GetSection("General:BatchSize").Value);
                Trace.TraceInformation($"General:BatchSize={BatchSize}");

                // RabbitMQ 
                RMQConnectionString = configuration.GetSection("RabbitMQ:ConnectionString").Value;
                Trace.TraceInformation($"RabbitMQ:ConnectionString={RMQConnectionString}");

                RMQQueueName = configuration.GetSection("RabbitMQ:QueueName").Value;
                Trace.TraceInformation($"RabbitMQ:QueueName={RMQQueueName}");

                RMQPrefetchCount = int.Parse(configuration.GetSection("RabbitMQ:PrefetchCount").Value);
                Trace.TraceInformation($"RabbitMQ:PrefetchCount={RMQPrefetchCount}");

                // Postgresql
                PostgreSQLConnectionString = configuration.GetSection("PostgreSQL:ConnectionString").Value;
                Trace.TraceInformation($"PostgreSQL:ConnectionString={PostgreSQLConnectionString}");

                // Redis
                RedisConnectionString = configuration.GetSection("Redis:ConnectionString").Value;
                Trace.TraceInformation($"Redis:ConnectionString={RedisConnectionString}");
            }
            catch (Exception e)
            {
                Trace.TraceError($"Setting error: {e.Message}");
                throw;
            }
        }
    }
}