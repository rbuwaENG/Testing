using Masterloop.Cloud.WebAPI.Models;
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
    }
}