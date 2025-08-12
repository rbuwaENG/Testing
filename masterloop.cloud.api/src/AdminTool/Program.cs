using System;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Security.Principal;
using System.Security.AccessControl;
using Masterloop.Core.Types.Devices;
using Masterloop.Tools.AdminTool.Settings;
using Microsoft.Extensions.Configuration;
using NLog;

namespace Masterloop.Tools.AdminTool
{
    class Program
    {
        static void Main(string[] args)
        {
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

            MasterloopInit init = new MasterloopInit(settings.RedisConnectionString, settings.PostgreSQLConnectionString, settings.RabbitMQConnectionString, settings.MasterloopTargetHostname);

            MasterloopMigrate migrate = new MasterloopMigrate(
                settings.MasterloopMigrationSourceHostname,
                settings.MasterloopMigrationSourceUsername,
                settings.MasterloopMigrationSourcePassword,
                settings.RabbitMQConnectionString,
                settings.RedisConnectionString,
                settings.PostgreSQLConnectionString);

            RMQTool rmqTool = new RMQTool(
                            settings.MasterloopTargetHostname,
                            settings.MasterloopTargetUsername,
                            settings.MasterloopTargetPassword,
                            settings.RabbitMQConnectionString);

            APITool apiTool = new APITool(
                settings.MasterloopMigrationSourceHostname,
                settings.MasterloopMigrationSourceUsername,
                settings.MasterloopMigrationSourcePassword,
                settings.MasterloopTargetHostname,
                settings.MasterloopTargetUsername,
                settings.MasterloopTargetPassword);

            ExportImportTool exportImportTool = new(settings.MasterloopMigrationSourceHostname, settings.MasterloopMigrationSourceUsername, settings.MasterloopMigrationSourcePassword);

            try
            {
                if (args.Length > 0)
                {
                    string operation = args[0].ToLower();

                    // Init functions
                    if (operation == "--initredis" && args.Length == 1)
                    {
                        init.InitRedis();
                        return;
                    }

                    if (operation == "--initpostgresql" && args.Length == 2)
                    {
                        init.InitPostgreSQL(args[1]);
                        return;
                    }

                    if (operation == "--initrabbitmq" && args.Length == 1)
                    {
                        init.InitRabbitMQ();
                        return;
                    }

                    if (operation == "--createtenant" && args.Length == 2)
                    {
                        migrate.CreateTenant(args[1]);
                        return;
                    }

                    if (operation == "--importtemplate" && args.Length == 3)
                    {
                        string tid = args[1];
                        int tenantId = Int32.Parse(args[2]);
                        migrate.MigrateTemplate(tid, tenantId);
                        return;
                    }

                    // Direct database operations
                    if (operation == "--addtenantaccount" && args.Length == 3)
                    {
                        int tenantId = Int32.Parse(args[1]);
                        string accountId = args[2];
                        migrate.AddTenantAccount(tenantId, accountId);
                        return;
                    }

                    if (operation == "--importdevices" && args.Length == 2)
                    {
                        string tid = args[1];
                        migrate.MigrateDevices(tid, 200);
                        return;
                    }

                    if (operation == "--importdevicesbyfile" && args.Length == 3)
                    {
                        string tid = args[1];
                        string filename = args[2];
                        migrate.MigrateDevicesByFile(tid, filename);
                        return;
                    }

                    if (operation == "--importdevicesettings" && args.Length == 2)
                    {
                        string tid = args[1];
                        migrate.MigrateDeviceSettings(tid, 200);
                        return;
                    }

                    // RabbitMQ operations
                    if (operation == "--rmqimporttemplate" && args.Length == 2)
                    {
                        string tid = args[1];
                        migrate.RMQImportTemplate(tid);
                        return;
                    }

                    if (operation == "--rmqimportdevicesbytemplate" && args.Length == 3)
                    {
                        string tid = args[1];
                        DeviceProtocolType protocol = (DeviceProtocolType)Int32.Parse(args[2]);
                        Trace.TraceInformation($"ImportByTemplate template={tid}, protocol={protocol}");
                        migrate.RMQImportDevicesByTemplate(tid, protocol);
                        return;
                    }

                    if (operation == "--rmqcreatedeviceaccount" && args.Length == 3)
                    {
                        string mid = args[1];
                        DeviceProtocolType protocol = (DeviceProtocolType)Int32.Parse(args[2]);
                        Trace.TraceInformation($"RMQCreateDeviceAccount   mid={mid}, protocol={protocol}");
                        migrate.RMQCreateDeviceAccount(mid, protocol);
                        return;
                    }

                    if (operation == "--rmqimportdevicesbyfile" && args.Length == 4)
                    {
                        string tid = args[1];
                        string filename = args[2];
                        int protocol = Int32.Parse(args[3]);
                        Trace.TraceInformation($"ImportByFile template={tid}, protocol={protocol}, filename={filename}");
                        migrate.RMQImportTemplateDevicesByFile(tid, filename, (DeviceProtocolType)(protocol));
                        return;
                    }

                    if (operation == "--rmqdeleteamqpqueues" && args.Length == 3)
                    {
                        string tid = args[1];
                        DateTime fromCreatedTime = DateTime.Parse(args[2], null, System.Globalization.DateTimeStyles.AssumeUniversal).ToUniversalTime();
                        Trace.TraceInformation($"Delete AMQP queues for template={tid} with created time >= {fromCreatedTime:o}");
                        rmqTool.RemoveAMQPQueues(tid, fromCreatedTime);
                        return;
                    }

                    if (operation == "--rmqgetexchanges")
                    {
                        string[] exchanges = rmqTool.GetAllExchanges();
                        if (exchanges != null)
                        {
                            foreach (string exchange in exchanges)
                            {
                                Console.WriteLine(exchange);
                            }
                        }
                        return;
                    }

                    if (operation == "--rmqgetqueues")
                    {
                        string[] queues = rmqTool.GetAllQueues();
                        if (queues != null)
                        {
                            foreach (string queue in queues)
                            {
                                Console.WriteLine(queue);
                            }
                        }
                        return;
                    }

                    if (operation == "--rmqgetusers")
                    {
                        string[] users = rmqTool.GetAllUsers();
                        if (users != null)
                        {
                            foreach (string user in users)
                            {
                                Console.WriteLine(user);
                            }
                        }
                        return;
                    }

                    if (operation == "--rmqdeleteexchangesbyfile" && args.Length == 2)
                    {
                        string filename = args[1];
                        Trace.TraceInformation($"Delete exchanges in file {filename}");
                        rmqTool.RemoveExchanges(filename);
                        return;
                    }

                    if (operation == "--rmqdeletequeuesbyfile" && args.Length == 2)
                    {
                        string filename = args[1];
                        Trace.TraceInformation($"Delete queues in file {filename}");
                        rmqTool.RemoveQueues(filename);
                        return;
                    }

                    if (operation == "--rmqdeleteusersbyfile" && args.Length == 2)
                    {
                        string filename = args[1];
                        Trace.TraceInformation($"Delete users in file {filename}");
                        rmqTool.RemoveUsers(filename);
                        return;
                    }

                    // API operations
                    if (operation == "--apicopydevicesbyfile" && args.Length == 3)
                    {
                        string tid = args[1];
                        string filename = args[2];
                        apiTool.CopyDevicesByFile(tid, filename);
                        return;
                    }

                    if (operation == "--apiexportobservationsbyfile" && args.Length == 7)
                    {
                        string mid = args[1];

                        int? observationId = null;
                        if (int.TryParse(args[2], out var result))
                            observationId = result;

                        if (!DateTimeOffset.TryParse(args[3], out var fromDate))
                            throw new Exception("Invalid from date. Date should be in ISO8601 format, like: 2022-09-15T00:00:00Z");

                        if (!DateTimeOffset.TryParse(args[4], out var toDate))
                            throw new Exception("Invalid to date. Date should be in ISO8601 format, like: 2022-09-15T00:00:00Z");

                        if (!int.TryParse(args[5], out var chunkSize))
                            throw new Exception("Invalid chunk size");

                        var outputDirectory = args[6];
                        Directory.CreateDirectory(outputDirectory);

                        exportImportTool.ExportObservations(mid, observationId, fromDate.UtcDateTime, toDate.UtcDateTime, chunkSize, outputDirectory);
                        return;
                    }

                    if (operation == "--apiremoveobservationscurrent" && args.Length == 2)
                    {
                        string mid = args[1];
                        exportImportTool.DeleteDeviceObservationsCurrent(mid);
                        return;
                    }

                    if (operation == "--apiremoveobservationhistory" && args.Length == 5)
                    {
                        string mid = args[1];

                        int? observationId = null;
                        if (int.TryParse(args[2], out var result))
                            observationId = result;

                        if (!DateTimeOffset.TryParse(args[3], out var fromDate))
                            throw new Exception("Invalid from date. Date should be in ISO8601 format, like: 2022-09-15T00:00:00Z");

                        if (!DateTimeOffset.TryParse(args[4], out var toDate))
                            throw new Exception("Invalid to date. Date should be in ISO8601 format, like: 2022-09-15T00:00:00Z");

                        exportImportTool.DeleteDeviceObservationsHistory(mid, observationId.Value, fromDate.DateTime, toDate.DateTime);
                        return;
                    }
                }
            }
            catch (Exception e)
            {
                Trace.TraceError(e.Message);
                return;
            }

            Trace.TraceInformation("Usage:");
            Trace.TraceInformation("  --initredis");
            Trace.TraceInformation("  --initpostgresql <db-name>");
            Trace.TraceInformation("  --initrabbitmq");

            Trace.TraceInformation("  --createtenant <tenant-name>");
            Trace.TraceInformation("  --createaccount <e-mail>");
            Trace.TraceInformation("  --importtemplate <tid> <tenantId>");
            Trace.TraceInformation("  --addtenantaccount <tid> <accountId>");
            Trace.TraceInformation("  --importdevices <tid>");
            Trace.TraceInformation("  --importdevicesbyfile <tid> <filename>");
            Trace.TraceInformation("  --importdevicesettings <tid>");

            Trace.TraceInformation("  --rmqimporttemplate <tid>");
            Trace.TraceInformation("  --rmqimportdevicesbytemplate <tid> <protocol-id>");
            Trace.TraceInformation("  --rmqimportdevicesbyfile <tid> <filename> <protocol-id>");
            Trace.TraceInformation("  --rmqcreatedeviceaccount <mid> <protocol-id>");

            Trace.TraceInformation("  --rmqgetexchanges");
            Trace.TraceInformation("  --rmqgetqueues");
            Trace.TraceInformation("  --rmqgetusers");

            Trace.TraceInformation("  --rmqdeleteamqpqueues <tid> <from-created-timestamp-iso8601>");
            Trace.TraceInformation("  --rmqdeleteexchangesbyfile <filename>");
            Trace.TraceInformation("  --rmqdeletequeuesbyfile <filename>");
            Trace.TraceInformation("  --rmqdeleteusersbyfile <filename>");

            Trace.TraceInformation("  --apicopydevicesbyfile <tid> <filename>");
            Trace.TraceInformation("  --apiexportobservationsbyfile <mid> <observationId> <fromTime> <toTime> <chunkSize> <export-root>");
            Trace.TraceInformation("  --apiremoveobservationscurrent <mid>");
            Trace.TraceInformation("  --apiremoveobservationhistory <mid> <oid> <fromTime> <toTime>");
        }
    }
}