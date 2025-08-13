using System.Threading.Tasks;

namespace Masterloop.Cloud.WebAPI.Services
{
    public interface ISmtpEmailService
    {
        Task SendEmailAsync(string toEmail, string subject, string bodyHtml, string bodyText = null);
        Task SendTwoFactorSetupEmailAsync(string toEmail, string secretKey, string qrCodeUrl);
        Task SendTwoFactorCodeEmailAsync(string toEmail, string totpCode);
    }
}