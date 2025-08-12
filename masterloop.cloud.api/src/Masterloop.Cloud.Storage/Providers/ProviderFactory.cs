namespace Masterloop.Cloud.Storage.Providers
{
    public class ProviderFactory
    {
        public static IDbProvider GetDbProvider(DbProviderTypes type, string connectionString)
        {
            IDbProvider provider = null;
            if (type == DbProviderTypes.PostgreSql)
            {
                provider = new PostgreSqlDbProvider(connectionString);
            }
            return provider;
        }

        public static ICacheProvider GetCacheProvider(CacheProviderTypes type, string connectionString)
        {
            ICacheProvider provider = null;
            if (type == CacheProviderTypes.Redis)
            {
                provider = new RedisCacheProvider(connectionString);
            }
            return provider;
        }
    }
}