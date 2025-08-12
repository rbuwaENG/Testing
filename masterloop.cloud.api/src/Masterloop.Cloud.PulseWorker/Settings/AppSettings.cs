using System;
using System.Linq;
using Microsoft.Extensions.Configuration;

namespace Masterloop.Cloud.PulseWorker.Settings
{
    public class AppSettings
    {
        // General
        public string Mode { get; set; }
        public int PulseIntervalSeconds { get; set; }
        public int PulseTTLSeconds { get; set; }
        public string RMQConnectionString { get; }
        public string PublishExchange { get; set; } // If not set, publish to Device Exchange ("MID.X").

        // ConnectionListMode
        public string[] Prefixes { get; set; }

        // DeviceMessageMode
        public string QueueName { get; set; }
        public ushort PrefetchCount { get; set; }
        public ushort HeartbeatSeconds { get; set; }

        public AppSettings(IConfiguration configuration)
        {
            // General
            Mode = configuration.GetSection("General:Mode").Value;
            PulseIntervalSeconds = Int32.Parse(configuration.GetSection("General:PulseIntervalSeconds").Value);
            PulseTTLSeconds = Int32.Parse(configuration.GetSection("General:PulseTTLSeconds").Value);
            RMQConnectionString = configuration.GetSection("General:RMQConnectionString").Value;
            PublishExchange = configuration.GetSection("General:PublishExchange").Value;

            // ConnectionListMode
            Prefixes = configuration.GetSection("ConnectionListMode:Prefixes").AsEnumerable().Where(s => s.Value != null).Select(s => s.Value).ToArray();

            // DeviceMessageMode
            QueueName = configuration.GetSection("DeviceMessageMode:QueueName").Value;
            PrefetchCount = ushort.Parse(configuration.GetSection("DeviceMessageMode:PrefetchCount").Value);
            HeartbeatSeconds = ushort.Parse(configuration.GetSection("DeviceMessageMode:HeartbeatSeconds").Value);
        }
    }
}