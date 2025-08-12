using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using Masterloop.Cloud.MonitorWorker.Settings;
using Microsoft.Extensions.Configuration;
using NLog;

namespace Masterloop.Cloud.MonitorWorker
{
    class Program
    {
        static void Main(string[] args)
        {
            // Initialize settings
            var builder = new ConfigurationBuilder()
                   .SetBasePath(Directory.GetCurrentDirectory())
                   .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true);
            IConfiguration configuration = builder.Build();
            AppSettings settings = new AppSettings(configuration);

            // Initialize NLog
            LogManager.Setup().LoadConfigurationFromFile("NLog.config");
            // Listen to Trace Events
            Trace.Listeners.Add(new NLogTraceListener() { Name = "nlog" });

            Trace.TraceInformation("Starting MonitorWorker.");
            using (MQTTMonitor mqtt = new MQTTMonitor(settings.MCSAPIHost, settings.MCSUser, settings.MCSPasswd, settings.MCSDeviceMID, settings.MCSLoggerMID, settings.MCSLoggerPSK, settings.MCSCmdId, settings.MCSObsId))
            {
                Trace.TraceInformation("Running.");
                while (true)
                {
                    // Run one logging
                    try
                    {
                        Trace.TraceInformation("Polling.");
                        mqtt.Run();
                    }
                    catch (Exception e)
                    {
                        Trace.TraceError("Top Level Exception");
                        Trace.TraceError($"Message: {e.Message}");
                        Trace.TraceError($"StackTrace: {e.StackTrace}");
                    }

                    // Wait till next round
                    Thread.Sleep(settings.IntervalSeconds * 1000);
                }
            }
        }
    }
}
