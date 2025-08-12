using Amazon;
using Amazon.SimpleEmail;
using Amazon.SimpleEmail.Model;
using Microsoft.Extensions.Configuration;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Masterloop.Cloud.WebAPI.Services
{
    public class EmailService : IEmailService
    {
        private readonly string _fromEmail;
        private readonly string _senderName;
        private readonly string _regionName;

        public EmailService(IConfiguration config)
        {
            _fromEmail = config["SmtpAndApiConfiguration:FromEmail"];
            _senderName = config["SmtpAndApiConfiguration:Sender"];
            _regionName = config["SmtpAndApiConfiguration:Region"];
        }

        public async Task SendEmailAsync(string toEmail, string subject, string bodyHtml)
        {
            var sourceAddress = !string.IsNullOrEmpty(_senderName)
                ? $"{_senderName} <{_fromEmail}>"
                : _fromEmail;

            var region = RegionEndpoint.GetBySystemName(_regionName);

            using var client = new AmazonSimpleEmailServiceClient(region);

            var sendRequest = new SendEmailRequest
            {
                Source = sourceAddress,
                Destination = new Destination
                {
                    ToAddresses = new List<string> { toEmail }
                },
                Message = new Message
                {
                    Subject = new Content(subject),
                    Body = new Body
                    {
                        Html = new Content(bodyHtml)
                    }
                }
            };

            await client.SendEmailAsync(sendRequest);
        }

    }

}
