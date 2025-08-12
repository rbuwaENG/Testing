using Masterloop.Core.Types.Commands;

namespace Masterloop.Cloud.Core.RMQ
{
    public class CommandResponseMessage
    {
        public string MID { get; set; }
        public CommandResponse CommandResponse { get; set; }
    }
}