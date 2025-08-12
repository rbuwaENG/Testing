namespace Masterloop.Cloud.Core.RMQ.API
{
    public class MessageProperties
    {
        public string expiration { get; set; }
        public int delivery_mode { get; set; }
    }
}
