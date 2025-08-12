using Masterloop.Cloud.WebAPI.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Masterloop.Cloud.WebAPI.Services
{
    public interface ITwoFactorAuthService
    {
        Task<TwoFactorAuthSetupResponse> SetupTwoFactorAsync(string email);
        Task<bool> VerifyTwoFactorAsync(string email, string totpCode);
        Task<bool> EnableTwoFactorAsync(string email, string totpCode);
        Task<bool> DisableTwoFactorAsync(string email, string totpCode);
        Task<bool> IsTwoFactorEnabledAsync(string email);
        Task<string> GetTwoFactorSecretAsync(string email);
        Task<bool> SendTwoFactorCodeEmailAsync(string email);
        
        // Admin methods
        Task<AdminTwoFactorManagementResponse> AdminEnableTwoFactorAsync(string userEmail, string adminEmail, string adminPassword);
        Task<AdminTwoFactorManagementResponse> AdminDisableTwoFactorAsync(string userEmail, string adminEmail, string adminPassword);
        Task<List<UserTwoFactorStatus>> GetAllUsersTwoFactorStatusAsync(string adminEmail, string adminPassword);
        Task<bool> IsUserAdminAsync(string email, string password);
    }
}