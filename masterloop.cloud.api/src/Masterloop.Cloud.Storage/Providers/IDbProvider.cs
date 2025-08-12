using System.Data;

namespace Masterloop.Cloud.Storage.Providers
{
    public interface IDbProvider
    {
        string ConnectionString { get; }
        IDbConnection GetConnection();
    }
}