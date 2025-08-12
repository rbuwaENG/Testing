using StackExchange.Redis;

namespace Masterloop.Cloud.Storage.Providers
{
    public interface ICacheProvider
    {
        string ConnectionString { get; }
        ConnectionMultiplexer GetConnection();
        IDatabase GetDatabase(int databaseId);
    }
}