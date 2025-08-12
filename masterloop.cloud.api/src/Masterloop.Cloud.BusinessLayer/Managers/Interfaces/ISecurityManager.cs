using Masterloop.Cloud.Core.Security;

namespace Masterloop.Cloud.BusinessLayer.Managers.Interfaces
{
    public interface ISecurityManager
    {
        User[] GetUsers();
        string CreateUser(SecureUser user);
        bool UpdateUser(User user);
        bool DeleteUser(string email);
        Account[] GetAccounts(AccountType? type);
        Account GetAccount(string accountId);
        UserInformation GetUserInformation(string email);
        Account Authenticate(string accountId, string password);
        DevicePermission[] GetDevicePermissionsForDevice(string MID);
        DevicePermission GetDevicePermissionForAccountAndDevice(string accountId, string MID);
        TemplatePermission GetTemplatePermissionForAccountAndTemplate(string accountId, string templateId);
        TenantPermission[] GetTenantPermissionsForAccount(string accountId);
        AccountType ParseAccountType(string accountId);
        string GeneratePasswordResetToken(string email);
        bool ResetPassword(string email, string token, string newPassword);
    }
}