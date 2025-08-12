using Masterloop.Cloud.Core.Security;
using Masterloop.Cloud.WebAPI.Models;

namespace Masterloop.Cloud.WebAPI.Services
{
    public interface ISecurityService
    {
        UserLoginResult GetToken(UserLogin login);
        UserLoginResult GenerateToken(Account account);
    }
}