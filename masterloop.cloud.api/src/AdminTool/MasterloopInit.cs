using Dapper;
using System.Data;
using Masterloop.Cloud.BusinessLayer.Managers;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.Storage.Providers;
using Masterloop.Cloud.Storage.Repositories;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using System.IO;
using System.Diagnostics;
using Masterloop.Cloud.Core.Tenant;
using Masterloop.Cloud.BusinessLayer.Services.RMQ;
using Masterloop.Cloud.Core.RMQ;
using Masterloop.Cloud.Core.Security;
using Masterloop.Cloud.Core.Node;
using Masterloop.Core.Types.LiveConnect;

namespace Masterloop.Tools.AdminTool
{
    public class MasterloopInit
    {
        private string _redisConnectionString;
        private string _postgreSQLConnectionString;
        private string _rabbitMQConnectionString;
        private string _apiHost;

        public MasterloopInit(string redisConnectionString, string postgreSQLConnectionString, string rabbitMQConnectionString, string apiHost)
        {
            _redisConnectionString = redisConnectionString;
            _postgreSQLConnectionString = postgreSQLConnectionString;
            _rabbitMQConnectionString = rabbitMQConnectionString;
            _apiHost = apiHost;
        }

        public void InitRedis()
        {
            Trace.TraceInformation("Redis initialization started.");

            // Create Masterloop Tenant
            ICacheProvider cacheProvider = ProviderFactory.GetCacheProvider(CacheProviderTypes.Redis, _redisConnectionString);
            ITenantRepository tenantRepo = new TenantRepository(cacheProvider);
            IUserRepository userRepo = new UserRepository(cacheProvider);
            IDeviceRepository deviceRepo = new DeviceRepository(cacheProvider);
            INodeRepository nodeRepo = new NodeRepository(cacheProvider);
            ITenantManager tenantManager = new TenantManager(tenantRepo, userRepo);
            ISecurityManager securityManager = new SecurityManager(userRepo, tenantRepo, deviceRepo);

            // Create default admin user
            SecureUser adminUser = new SecureUser()
            {
                EMail = "admin@masterloop.com",
                FirstName = "Masterloop",
                LastName = "Admin",
                IsAdmin = true
            };
            string adminPassword = securityManager.CreateUser(adminUser);
            Trace.TraceInformation($"Default admin user created:");
            Trace.TraceInformation($"  EMail: {adminUser.EMail}");
            Trace.TraceInformation($"  Password: {adminPassword}");

            // Create Default tenant
            int tenantId = tenantManager.CreateTenant("Default");
            Trace.TraceInformation($"Tenant created with id {tenantId}");

            SecureTenant secureTenant = tenantRepo.Get(tenantId);
            Trace.TraceInformation("Tenant information:");
            Trace.TraceInformation($"  Login: {secureTenant.Login}");
            Trace.TraceInformation($"  PreSharedKey: {secureTenant.PreSharedKey}");

            // Give default admin user access to Default tenant
            Trace.TraceInformation("Giving default admin user access to default tenant...");
            TenantPermission defaultTenantPermission = new TenantPermission(adminUser.EMail, tenantId, true, true, true);
            if (tenantManager.SetTenantPermission(defaultTenantPermission))
            {
                Trace.TraceInformation("  > SUCCESS");
            }
            else
            {
                Trace.TraceInformation("  > FAILED");
            }

            // Configure default device node.
            Trace.TraceInformation("Configuring default device node...");
            MessagingConnection rmqCon = new MessagingConnection(_rabbitMQConnectionString);
            DeviceNodeConfiguration devNodeConfig = new DeviceNodeConfiguration()
            {
                Id = "DEFAULT",
                APIHost = _apiHost,
                MQHost = rmqCon.HostName,
                BackoffSeconds = 300
            };
            if (nodeRepo.Create(devNodeConfig) != null)
            {
                Trace.TraceInformation("  > SUCCESS");
            }
            else
            {
                Trace.TraceInformation("  > FAILED");
            }

            Trace.TraceInformation("Redis configuration successfully completed.");
        }

        public void InitPostgreSQL(string dbName)
        {
            Trace.TraceInformation("PostgreSQL initialization started.");

            IDbProvider dbProvider = ProviderFactory.GetDbProvider(DbProviderTypes.PostgreSql, _postgreSQLConnectionString);
            using (IDbConnection dbConnection = dbProvider.GetConnection())
            {
                Trace.TraceInformation($"Opening database: {dbName}");
                dbConnection.Open();

                Trace.TraceInformation($"Configuring database: {dbName}");
                dbConnection.Execute(File.ReadAllText("Queries/db_database.sql"));

                Trace.TraceInformation("Creating table: command");
                dbConnection.Execute(File.ReadAllText("Queries/db_command.sql"));

                Trace.TraceInformation("Creating table: device_event");
                dbConnection.Execute(File.ReadAllText("Queries/db_device_event.sql"));

                Trace.TraceInformation("Creating table: firmware_patch");
                dbConnection.Execute(File.ReadAllText("Queries/db_firmware_patch.sql"));

                Trace.TraceInformation("Creating table: firmware_release");
                dbConnection.Execute(File.ReadAllText("Queries/db_firmware_release.sql"));

                Trace.TraceInformation("Creating table: observation");
                dbConnection.Execute(File.ReadAllText("Queries/db_observation.sql"));

                Trace.TraceInformation("Creating table: pulse");
                dbConnection.Execute(File.ReadAllText("Queries/db_pulse.sql"));

                Trace.TraceInformation("Creating table: system_event");
                dbConnection.Execute(File.ReadAllText("Queries/db_system_event.sql"));

                Trace.TraceInformation("Creating table: user_event");
                dbConnection.Execute(File.ReadAllText("Queries/db_user_event.sql"));

                Trace.TraceInformation("PostgreSQL configuration successfully completed.");
            }
        }

        public void InitRabbitMQ()
        {
            Trace.TraceInformation("RabbitMQ initialization started.");

            IRMQAdminClient rmq = new RMQAdminClient(_rabbitMQConnectionString);

            Trace.TraceInformation($"Creating Root Exchange ({RMQNameProvider.GetRootExchangeName()}).");
            rmq.CreateTopicExchange(RMQNameProvider.GetRootExchangeName());

            Trace.TraceInformation($"Creating MQTT Exchange ({RMQNameProvider.GetMqttExchangeName()}).");
            rmq.CreateTopicExchange(RMQNameProvider.GetMqttExchangeName());

            Trace.TraceInformation($"Creating mqtt-outbox Exchange ({RMQNameProvider.GetMqttOutboxExchangeName()}).");
            rmq.CreateTopicExchange(RMQNameProvider.GetMqttOutboxExchangeName());
            rmq.CreateBindingBetweenTwoExchanges(RMQNameProvider.GetMqttOutboxExchangeName(), RMQNameProvider.GetMqttExchangeName(), BindingKey.GenerateCommandBindingKey());
            rmq.CreateBindingBetweenTwoExchanges(RMQNameProvider.GetMqttOutboxExchangeName(), RMQNameProvider.GetMqttExchangeName(), BindingKey.GenerateApplicationsPulseBindingKey());

            Trace.TraceInformation($"Creating mqtt-inbox Exchange ({RMQNameProvider.GetMqttInboxExchangeName()}).");
            rmq.CreateTopicExchange(RMQNameProvider.GetMqttInboxExchangeName());
            rmq.CreateBindingBetweenTwoExchanges(RMQNameProvider.GetMqttExchangeName(), RMQNameProvider.GetMqttInboxExchangeName(), BindingKey.GenerateObservationBindingKey());
            rmq.CreateBindingBetweenTwoExchanges(RMQNameProvider.GetMqttExchangeName(), RMQNameProvider.GetMqttInboxExchangeName(), BindingKey.GenerateObservationPackageBindingKey());
            rmq.CreateBindingBetweenTwoExchanges(RMQNameProvider.GetMqttExchangeName(), RMQNameProvider.GetMqttInboxExchangeName(), BindingKey.GenerateCommandResponseBindingKey());
            rmq.CreateBindingBetweenTwoExchanges(RMQNameProvider.GetMqttExchangeName(), RMQNameProvider.GetMqttInboxExchangeName(), BindingKey.GeneratePulseBindingKey());

            Trace.TraceInformation("RabbitMQ configuration successfully completed.");
        }
    }
}
