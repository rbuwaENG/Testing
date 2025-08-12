namespace Masterloop.Cloud.Core.RMQ.API
{
    public class ConnectionInfo
    {
        public int channels { get; set; }
        public string host { get; set; }
        public string name { get; set; }
        public string node { get; set; }
        public string peer_host { get; set; }
        public int peer_port { get; set; }
        public int port { get; set; }
        public string protocol { get; set; }
        public string state { get; set; }
        public string type { get; set; }
        public bool ssl { get; set; }
        public string user { get; set; }
        public int timeout { get; set; }
        public long connected_at { get; set; }
    }
}