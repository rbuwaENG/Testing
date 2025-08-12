using System;
using StackExchange.Redis;

namespace Masterloop.Cloud.Storage.Providers
{
    public class RedisCacheProvider : ICacheProvider
    {
        private static Lazy<ConnectionMultiplexer> _lazyCacheConnection;

        public string ConnectionString { private set; get; }

        public RedisCacheProvider(string connectionString)
        {
            ConnectionString = connectionString;
        }

        public ConnectionMultiplexer GetConnection()
        {
            if (_lazyCacheConnection == null)
            {
                _lazyCacheConnection = new Lazy<ConnectionMultiplexer>(() =>
                {
                    var options = ConfigurationOptions.Parse(ConnectionString);
                    options.ClientName = System.Reflection.Assembly.GetCallingAssembly().FullName;
                    options.AbortOnConnectFail = true;
                    options.ConnectRetry = 1000;
                    options.SyncTimeout = 30 * 1000;
                    return ConnectionMultiplexer.Connect(options);
                });
            }
            return _lazyCacheConnection.Value;
        }

        public IDatabase GetDatabase(int databaseId)
        {
            ConnectionMultiplexer connection = GetConnection();
            if (connection != null)
            {
                return connection.GetDatabase(databaseId);
            }
            else
            {
                return null;
            }
        }
    }
}