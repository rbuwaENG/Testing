using System;
namespace Masterloop.Cloud.Core.Node
{
    public class NodeConfiguration
    {
        public string Id { get; set; }
        public string APIHost { get; set; }
        public int? APIHTTPPort { get; set; }
        public int? APIHTTPSPort { get; set; }

        public string MQHost { get; set; }

        public int? AMQPPort { get; set; }
        public int? AMQPSPort { get; set; }
        public string AMQPVHost { get; set; }

        public int? MQTTPort { get; set; }
        public int? MQTTSPort { get; set; }

        public int? WSPort { get; set; }
        public int? WSSPort { get; set; }
    }
}
