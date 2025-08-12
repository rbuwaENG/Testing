using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Masterloop.Cloud.Core.RMQ;
using Masterloop.Cloud.HistorianWorker.Settings;
using Microsoft.Extensions.Configuration;
using NLog;

namespace Masterloop.Cloud.HistorianWorker
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

            Trace.TraceInformation("Starting HistorianWorker");

            List<Task> tasks = new List<Task>();
            for (int i = 0; i < settings.Threads; i++)
            {
                int thread = i;
                tasks.Add(Task.Run(() => RunHistorian(settings, thread)));
            }
            Task.WaitAll(tasks.ToArray());
        }

        static void RunHistorian(AppSettings settings, int threadId)
        {
            MessagingConnection rmqConfig = new MessagingConnection(settings.RMQConnectionString);
            using (HistorianHandler handler = new HistorianHandler(
                rmqConfig,
                settings.RMQQueueName,
                settings.RMQPrefetchCount,
                settings.Consumer,
                settings.PostgreSQLConnectionString,
                settings.RedisConnectionString,
                settings.BatchSize))
            {
                Trace.TraceInformation("Running.");
                while (true)
                {
                    try
                    {
                        handler.Run();
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