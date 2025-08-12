using System;
using System.Diagnostics;
using System.IO;
using Masterloop.Cloud.PulseWorker.Settings;
using Microsoft.Extensions.Configuration;
using NLog;

namespace Masterloop.Cloud.PulseWorker
{
    class Program
    {
        static void Main(string[] args)
        {
            // Initialize settings
            var env = Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT");
            var builder = new ConfigurationBuilder()
                   .SetBasePath(Directory.GetCurrentDirectory())
                   .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
                   .AddJsonFile($"appsettings.{env}.json", optional: true, reloadOnChange: true)
                   .AddEnvironmentVariables(prefix: "MCS_");
            IConfiguration configuration = builder.Build();
            AppSettings settings = new AppSettings(configuration);

            // Initialize NLog
            LogManager.Setup().LoadConfigurationFromFile("NLog.config");
            // Listen to Trace Events
            Trace.Listeners.Add(new NLogTraceListener() { Name = "nlog" });

            Trace.TraceInformation("Starting PulseWorker.");
            IPulseGenerator pulseGenerator;

            try
            {
                if (settings.Mode == "DeviceMessage")
                {
                    pulseGenerator = new DeviceMessagePulseGenerator(
                        settings.RMQConnectionString,
                        settings.QueueName,
                        settings.PrefetchCount,
                        settings.HeartbeatSeconds,
                        settings.PulseTTLSeconds,
                        settings.PulseIntervalSeconds);

                }
                else if (settings.Mode == "ConnectionList")
                {
                    pulseGenerator = new ConnectionListPulseGenerator(
                        settings.RMQConnectionString,
                        settings.PulseIntervalSeconds,
                        settings.PulseTTLSeconds,
                        settings.Prefixes);
                }
                else
                {
                    throw new ArgumentException($"Unsupported Mode: {settings.Mode}");
                }

                Trace.TraceInformation("Initializing.");
                if (pulseGenerator.Init())
                {
                    Trace.TraceInformation("Running.");
                    bool endedOK = pulseGenerator.Run();
                    if (endedOK)
                    {
                        Trace.TraceInformation("Stopped normally.");
                    }
                    else
                    {
                        Trace.TraceError("Stopped unexpectedly.");
                    }
                }
                else
                {
                    Trace.TraceError("Initializion failed.");
                }
            }
            catch (Exception e)
            {
                Trace.TraceError("Top Level Exception");
                Trace.TraceError($"Message: {e.Message}");
                Trace.TraceError($"StackTrace: {e.StackTrace}");
            }
        }
    }
}