using System.Data;
using Npgsql;

namespace Masterloop.Cloud.Storage.Providers
{
    public class PostgreSqlDbProvider : IDbProvider
    {
        public string ConnectionString { private set; get; }

        public PostgreSqlDbProvider(string connectionString)
        {
            ConnectionString = connectionString;
        }

        public IDbConnection GetConnection()
        {
            return new NpgsqlConnection(ConnectionString);
        }
    }
}