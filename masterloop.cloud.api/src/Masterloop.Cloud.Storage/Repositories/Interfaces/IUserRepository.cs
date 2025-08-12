using Masterloop.Cloud.Core.Security;

namespace Masterloop.Cloud.Storage.Repositories.Interfaces
{
    public interface IUserRepository : IRepository<SecureUser, string>
    {
    }
}