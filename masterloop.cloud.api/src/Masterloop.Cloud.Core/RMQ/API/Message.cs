namespace Masterloop.Cloud.Core.RMQ.API
{
    public class Message
    {
        public int payload_bytes { get; set; }
        public bool redelivered { get; set; }
        public string exchange { get; set; }
        public string routing_key { get; set; }
        public int message_count { get; set; }
        public MessageProperties properties { get; set; }
        public string payload { get; set; }
        public string payload_encoding { get; set; }
    }
}
