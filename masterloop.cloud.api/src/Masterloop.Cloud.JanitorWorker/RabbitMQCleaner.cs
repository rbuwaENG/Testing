using Masterloop.Cloud.BusinessLayer.Services.RMQ;
using System;
using System.Diagnostics;

namespace Masterloop.Cloud.JanitorWorker
{
    public class RabbitMQCleaner
    {
        DateTime _latestUpdate;
        RMQCleanerService _cleanerSvc;
        int _intervalSeconds;

        public RabbitMQCleaner(string messagingConnectionString, int intervalSeconds)
        {
            _cleanerSvc = new RMQCleanerService(messagingConnectionString);
            _latestUpdate = DateTime.MinValue;
            _intervalSeconds = intervalSeconds;
        }

        public void ProcessNext()
        {
            TimeSpan timeSinceLastUpdate = DateTime.UtcNow - _latestUpdate;
            if (timeSinceLastUpdate.TotalSeconds > _intervalSeconds)
            {
                _latestUpdate = DateTime.UtcNow;

                Trace.TraceInformation("Deleting unused exchanges and users...");
                int count = _cleanerSvc.CleanupUnusedExchangesAndUsers();
                Trace.TraceInformation($"Cleaning finished, deleted {count} objects.");

                Trace.TraceInformation("Deleting unused users...");
                int users = _cleanerSvc.CleanupUnusedUsers();

                Trace.TraceInformation("Deleting unused exchanges...");
                int exchanges = _cleanerSvc.CleanupUnusedExchanges();

                Trace.TraceInformation($"Cleaning finished, deleted objects: Users={users}, Exchanges={exchanges}");
            }
        }
    }
}