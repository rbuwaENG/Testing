namespace Masterloop.Cloud.Core.RMQ.API
{
    public class QueueMessageArgument
    {
        public int count { get; set; }
        public string ackmode { get; set; }
        public string encoding { get; set; }
    }
}