using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Masterloop.Cloud.ChopperWorker.Settings;
using Microsoft.Extensions.Configuration;
using NLog;

namespace Masterloop.Cloud.ChopperWorker
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
            LogManager.Setup().LoadConfigurationFromFile(settings.NLogConfigFile);

            // Listen to Trace Events
            Trace.Listeners.Add(new NLogTraceListener() { Name = "nlog" });

            Trace.TraceInformation("Starting ChopperWorker");
            List<Task> tasks = new List<Task>();
            for (int i = 0; i < settings.Threads; i++)
            {
                int thread = i;
                tasks.Add(Task.Run(() => RunChopper(settings, thread)));
            }
            Task.WaitAll(tasks.ToArray());
        }

        static void RunChopper(AppSettings settings, int threadId)
        {
            using (MessageChopper chopper = new MessageChopper(
                settings.RMQConnectionString,
                settings.RMQQueueName,
                (ushort)settings.RMQHeartbeat,
                (ushort)settings.RMQPrefetchCount,
                settings.RMQMessageExpiration,
                settings.RMQPublishConfirmTimeout,
                settings.BatchSize,
                threadId))
            {
                Trace.TraceInformation("Running.");
                while (true)
                {
                    try
                    {
                        chopper.Run();
                        Thread.Sleep(100);  // Avoid over-heating CPU.
                    }
                    catch (Exception e)
                    {
                        Trace.TraceError($"{threadId} : Top Exception {e.Message}");
                    }
                }
            }
        }
    }
}