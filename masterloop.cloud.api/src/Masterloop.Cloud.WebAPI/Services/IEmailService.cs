using System.Threading.Tasks;

namespace Masterloop.Cloud.WebAPI.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(string toEmail, string subject, string bodyHtml);
    }
}
