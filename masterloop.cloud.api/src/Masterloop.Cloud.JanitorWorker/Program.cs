using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using Masterloop.Cloud.JanitorWorker.Settings;
using Microsoft.Extensions.Configuration;
using NLog;

namespace Masterloop.Cloud.JanitorWorker
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

            Trace.TraceInformation("Starting JanitorWorker");
            try
            {
                RabbitMQCleaner cleaner = new RabbitMQCleaner(settings.RabbitMQConnectionString, settings.RabbitMQCleanerIntervalSeconds);
                Trace.TraceInformation("Initializing...");
                while (true)
                {
                    cleaner.ProcessNext();
                    Thread.Sleep(1000);
                }
            }
            catch (Exception e)
            {
                Trace.TraceError("Top Level Exception");
                Trace.TraceError($"Message: {e.Message}");
                Trace.TraceError($"StackTrace: {e.StackTrace}");
                Thread.Sleep(30 * 1000);
            }
        }
    }
}
