using Masterloop.Core.Types.Commands;

namespace Masterloop.Cloud.Core.RMQ
{
    public class CommandMessage
    {
        public string MID { get; set; }
        public Command Command { get; set; }
        public string OriginApplication { get; set; }
        public string OriginAccount { get; set; }
        public string OriginAddress { get; set; }
        public string OriginReference { get; set; }
    }
}