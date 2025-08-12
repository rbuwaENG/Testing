using System.Diagnostics;
using Masterloop.Cloud.BusinessLayer.Services.RMQ;

namespace Masterloop.Tools.AdminTool
{
    public class RemoveDeadConnections
    {
        public static void Run()
        {
            RMQAdminClient rmq = new RMQAdminClient("TODO");
            var connections = rmq.GetConnections();
            foreach (var connection in connections)
            {
                if (connection.state == null)
                {
                    Trace.TraceInformation($"{connection.name} - {connection.user}");
                    rmq.DeleteConnection(connection.name);
                }
            }
        }
    }
}
