using System;
using System.Diagnostics;
using Microsoft.Extensions.Configuration;

namespace Masterloop.Cloud.ChopperWorker.Settings
{
    public class AppSettings
    {
        public string NLogConfigFile { get; }
        public int Threads { get; }
        public int BatchSize { get; }

        public string RMQConnectionString { get; }
        public string RMQQueueName { get; }
        public int RMQHeartbeat { get; }
        public int RMQPrefetchCount { get; }
        public int RMQMessageExpiration { get; }
        public int RMQPublishConfirmTimeout { get; }

        public AppSettings(IConfiguration configuration)
        {
            try
            {
                // General
                NLogConfigFile = configuration.GetSection("General:NLogConfigFile").Value;
                Trace.TraceInformation($"General:NLogConfigFile={NLogConfigFile}");

                Threads = int.Parse(configuration.GetSection("General:Threads").Value);
                Trace.TraceInformation($"General:Threads={Threads}");

                BatchSize = int.Parse(configuration.GetSection("General:BatchSize").Value);
                Trace.TraceInformation($"General:BatchSize={BatchSize}");

                // RabbitMQ 
                RMQConnectionString = configuration.GetSection("RabbitMQ:ConnectionString").Value;
                Trace.TraceInformation($"RabbitMQ:ConnectionString={RMQConnectionString}");

                RMQQueueName = configuration.GetSection("RabbitMQ:QueueName").Value;
                Trace.TraceInformation($"RabbitMQ:QueueName={RMQQueueName}");

                RMQHeartbeat = int.Parse(configuration.GetSection("RabbitMQ:Heartbeat").Value);
                Trace.TraceInformation($"RabbitMQ:Heartbeat={RMQHeartbeat}");

                RMQPrefetchCount = int.Parse(configuration.GetSection("RabbitMQ:PrefetchCount").Value);
                Trace.TraceInformation($"RabbitMQ:PrefetchCount={RMQPrefetchCount}");

                RMQMessageExpiration = int.Parse(configuration.GetSection("RabbitMQ:MessageExpiration").Value);
                Trace.TraceInformation($"RabbitMQ:MessageExpiration={RMQMessageExpiration}");

                RMQPublishConfirmTimeout = int.Parse(configuration.GetSection("RabbitMQ:PublishConfirmTimeout").Value);
                Trace.TraceInformation($"RabbitMQ:PublishConfirmTimeout={RMQPublishConfirmTimeout}");
            }
            catch (Exception e)
            {
                Trace.TraceError($"Setting error: {e.Message}");
                throw;
            }
        }
    }
}