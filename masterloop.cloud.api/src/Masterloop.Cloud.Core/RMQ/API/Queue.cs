using System.Collections.Generic;

namespace Masterloop.Cloud.Core.RMQ.API
{
    public class Queue
    {
        public int messages { get; set; }
        public int messages_ready { get; set; }
        public int messages_unacknowledged { get; set; }
        public int consumers { get; set; }
        public int memory { get; set; }
        public string policy { get; set; }
        public string exclusive_consumer_tag { get; set; }
        public string status { get; set; }
        public string name { get; set; }
        public string vhost { get; set; }
        public bool durable { get; set; }
        public bool auto_delete { get; set; }
        public Arguments arguments { get; set; }
        public string node { get; set; }
        public IEnumerable<string> slave_nodes { get; set; }
        public IEnumerable<string> synchronised_slave_nodes { get; set; }
    }
}
