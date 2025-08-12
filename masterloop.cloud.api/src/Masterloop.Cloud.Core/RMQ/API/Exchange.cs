namespace Masterloop.Cloud.Core.RMQ.API
{
    public class Exchange
    {
        public string name { get; set; }
        public string vhost { get; set; }
        public string type { get; set; }
        public bool durable { get; set; }
        public bool auto_delete { get; set; }
        public bool @internal { get; set; }
    }
}
