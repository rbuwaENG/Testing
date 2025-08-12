using Microsoft.Extensions.Configuration;
using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;

namespace Masterloop.Cloud.WebAPI.Services
{
    public class SmtpEmailService : ISmtpEmailService
    {
        private readonly string _smtpServer;
        private readonly int _smtpPort;
        private readonly string _smtpUsername;
        private readonly string _smtpPassword;
        private readonly string _fromEmail;
        private readonly string _senderName;
        private readonly bool _enableSsl;

        public SmtpEmailService(IConfiguration config)
        {
            _smtpServer = config["SmtpConfiguration:Server"];
            _smtpPort = int.Parse(config["SmtpConfiguration:Port"] ?? "587");
            _smtpUsername = config["SmtpConfiguration:Username"];
            _smtpPassword = config["SmtpConfiguration:Password"];
            _fromEmail = config["SmtpConfiguration:FromEmail"];
            _senderName = config["SmtpConfiguration:SenderName"];
            _enableSsl = bool.Parse(config["SmtpConfiguration:EnableSsl"] ?? "true");
        }

        public async Task SendEmailAsync(string toEmail, string subject, string bodyHtml, string bodyText = null)
        {
            using var client = new SmtpClient(_smtpServer, _smtpPort)
            {
                EnableSsl = _enableSsl,
                Credentials = new NetworkCredential(_smtpUsername, _smtpPassword)
            };

            var message = new MailMessage
            {
                From = new MailAddress(_fromEmail, _senderName),
                Subject = subject,
                IsBodyHtml = true,
                Body = bodyHtml
            };

            if (!string.IsNullOrEmpty(bodyText))
            {
                message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(bodyText, "text/plain"));
            }

            message.To.Add(toEmail);

            await client.SendMailAsync(message);
        }

        public async Task SendTwoFactorSetupEmailAsync(string toEmail, string secretKey, string qrCodeUrl)
        {
            var subject = "Two-Factor Authentication Setup - Masterloop Cloud";
            var bodyHtml = GenerateTwoFactorSetupHtml(secretKey, qrCodeUrl);
            var bodyText = GenerateTwoFactorSetupText(secretKey, qrCodeUrl);

            await SendEmailAsync(toEmail, subject, bodyHtml, bodyText);
        }

        public async Task SendTwoFactorCodeEmailAsync(string toEmail, string totpCode)
        {
            var subject = "Your Two-Factor Authentication Code - Masterloop Cloud";
            var bodyHtml = GenerateTwoFactorCodeHtml(totpCode);
            var bodyText = GenerateTwoFactorCodeText(totpCode);

            await SendEmailAsync(toEmail, subject, bodyHtml, bodyText);
        }

        private string GenerateTwoFactorSetupHtml(string secretKey, string qrCodeUrl)
        {
            return $@"
                <html>
                <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                        <h2 style='color: #2c3e50;'>Two-Factor Authentication Setup</h2>
                        <p>Hello,</p>
                        <p>You have requested to set up two-factor authentication for your Masterloop Cloud account.</p>
                        
                        <div style='background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                            <h3 style='color: #2c3e50; margin-top: 0;'>Setup Instructions:</h3>
                            <ol>
                                <li>Install an authenticator app (like Google Authenticator, Authy, or Microsoft Authenticator)</li>
                                <li>Scan the QR code below or manually enter the secret key</li>
                                <li>Enter the 6-digit code from your authenticator app to complete setup</li>
                            </ol>
                        </div>

                        <div style='text-align: center; margin: 30px 0;'>
                            <h4>Secret Key:</h4>
                            <div style='background-color: #e9ecef; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 18px; letter-spacing: 2px;'>
                                {secretKey}
                            </div>
                        </div>

                        <div style='text-align: center; margin: 30px 0;'>
                            <h4>QR Code:</h4>
                            <p style='color: #6c757d; font-size: 14px;'>Scan this QR code with your authenticator app:</p>
                            <div style='background-color: #e9ecef; padding: 20px; border-radius: 8px; display: inline-block;'>
                                <img src='data:image/svg+xml;base64,{Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(GenerateQrCodeSvg(qrCodeUrl)))}' 
                                     alt='QR Code' style='max-width: 200px; height: auto;' />
                            </div>
                        </div>

                        <div style='background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;'>
                            <strong>Important:</strong> Keep your secret key secure and don't share it with anyone. 
                            If you lose access to your authenticator app, you may need to contact support to regain access to your account.
                        </div>

                        <p>Best regards,<br>Masterloop Cloud Team</p>
                    </div>
                </body>
                </html>";
        }

        private string GenerateTwoFactorSetupText(string secretKey, string qrCodeUrl)
        {
            return $@"
Two-Factor Authentication Setup

Hello,

You have requested to set up two-factor authentication for your Masterloop Cloud account.

Setup Instructions:
1. Install an authenticator app (like Google Authenticator, Authy, or Microsoft Authenticator)
2. Scan the QR code or manually enter the secret key
3. Enter the 6-digit code from your authenticator app to complete setup

Secret Key: {secretKey}

QR Code URL: {qrCodeUrl}

Important: Keep your secret key secure and don't share it with anyone. 
If you lose access to your authenticator app, you may need to contact support to regain access to your account.

Best regards,
Masterloop Cloud Team";
        }

        private string GenerateTwoFactorCodeHtml(string totpCode)
        {
            return $@"
                <html>
                <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                        <h2 style='color: #2c3e50;'>Your Two-Factor Authentication Code</h2>
                        <p>Hello,</p>
                        <p>You have requested a two-factor authentication code for your Masterloop Cloud account.</p>
                        
                        <div style='text-align: center; margin: 30px 0;'>
                            <h3 style='color: #2c3e50;'>Your Code:</h3>
                            <div style='background-color: #d4edda; padding: 20px; border-radius: 8px; border: 2px solid #c3e6cb;'>
                                <span style='font-family: monospace; font-size: 32px; font-weight: bold; color: #155724; letter-spacing: 4px;'>
                                    {totpCode}
                                </span>
                            </div>
                        </div>

                        <div style='background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;'>
                            <strong>Security Note:</strong> This code will expire in 30 seconds. 
                            If you didn't request this code, please ignore this email and consider changing your password.
                        </div>

                        <p>Best regards,<br>Masterloop Cloud Team</p>
                    </div>
                </body>
                </html>";
        }

        private string GenerateTwoFactorCodeText(string totpCode)
        {
            return $@"
Your Two-Factor Authentication Code

Hello,

You have requested a two-factor authentication code for your Masterloop Cloud account.

Your Code: {totpCode}

Security Note: This code will expire in 30 seconds. 
If you didn't request this code, please ignore this email and consider changing your password.

Best regards,
Masterloop Cloud Team";
        }

        private string GenerateQrCodeSvg(string qrCodeUrl)
        {
            // Simple SVG QR code representation - in a real implementation, you'd use a proper QR code library
            return $@"<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'>
                <rect width='200' height='200' fill='white'/>
                <text x='100' y='100' text-anchor='middle' dominant-baseline='middle' font-family='monospace' font-size='12' fill='black'>
                    QR Code for: {qrCodeUrl}
                </text>
            </svg>";
        }
    }
}