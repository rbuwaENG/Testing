using System;
using Microsoft.Extensions.Configuration;

namespace Masterloop.Cloud.JanitorWorker.Settings
{
    public class AppSettings
    {
        public string RabbitMQConnectionString { get; }
        public int RabbitMQCleanerIntervalSeconds { get; }

        public AppSettings(IConfiguration configuration)
        {
            // RabbitMQ 
            RabbitMQConnectionString = configuration.GetSection("RabbitMQ:ConnectionString").Value;

            // RabbitMQCleaner
            RabbitMQCleanerIntervalSeconds = Int32.Parse(configuration.GetSection("RabbitMQCleaner:IntervalSeconds").Value);
        }
    }
}
