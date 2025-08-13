using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.WebAPI.Models;
using Masterloop.Cloud.WebAPI.Services;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Masterloop.Cloud.WebAPI.Services
{
    public class TwoFactorAuthService : ITwoFactorAuthService
    {
        private readonly ITotpService _totpService;
        private readonly IEmailService _emailService;
        private readonly ISecurityManager _securityManager;
        
        // In-memory storage for 2FA secrets - in production, use database
        private static readonly ConcurrentDictionary<string, string> _twoFactorSecrets = new ConcurrentDictionary<string, string>();
        private static readonly ConcurrentDictionary<string, bool> _twoFactorEnabled = new ConcurrentDictionary<string, bool>();

        public TwoFactorAuthService(
            ITotpService totpService,
            IEmailService emailService,
            ISecurityManager securityManager)
        {
            _totpService = totpService;
            _emailService = emailService;
            _securityManager = securityManager;
        }

        public async Task<TwoFactorAuthSetupResponse> SetupTwoFactorAsync(string email)
        {
            // Check if user exists
            var user = _securityManager.GetUsers()?.FirstOrDefault(u => u.EMail.Equals(email, StringComparison.OrdinalIgnoreCase));
            if (user == null)
            {
                throw new InvalidOperationException("User not found");
            }

            // Check if 2FA is already enabled
            if (await IsTwoFactorEnabledAsync(email))
            {
                throw new InvalidOperationException("Two-factor authentication is already enabled for this user");
            }

            // Generate new secret key
            var secretKey = _totpService.GenerateSecretKey();
            
            // Store the secret temporarily (in production, store in database)
            _twoFactorSecrets[email] = secretKey;

            // Generate QR code URL
            var qrCodeUrl = _totpService.GenerateQrCodeUrl(email, secretKey);
            var manualEntryKey = _totpService.GenerateManualEntryKey(secretKey);

            // Send setup email using existing EmailService
            await SendTwoFactorSetupEmailAsync(email, secretKey, qrCodeUrl);

            return new TwoFactorAuthSetupResponse
            {
                SecretKey = secretKey,
                QrCodeUrl = qrCodeUrl,
                ManualEntryKey = manualEntryKey
            };
        }

        public async Task<bool> VerifyTwoFactorAsync(string email, string totpCode)
        {
            var secretKey = await GetTwoFactorSecretAsync(email);
            if (string.IsNullOrEmpty(secretKey))
            {
                return false;
            }

            return _totpService.ValidateTotpCode(secretKey, totpCode);
        }

        public async Task<bool> EnableTwoFactorAsync(string email, string totpCode)
        {
            // Verify the TOTP code
            if (!await VerifyTwoFactorAsync(email, totpCode))
            {
                return false;
            }

            // Mark 2FA as enabled
            _twoFactorEnabled[email] = true;
            
            // In production, store this in the database
            // await _userRepository.UpdateTwoFactorEnabled(email, true);

            return true;
        }

        public async Task<bool> DisableTwoFactorAsync(string email, string totpCode)
        {
            // Verify the TOTP code before disabling
            if (!await VerifyTwoFactorAsync(email, totpCode))
            {
                return false;
            }

            // Mark 2FA as disabled
            _twoFactorEnabled[email] = false;
            
            // Remove the secret
            _twoFactorSecrets.TryRemove(email, out _);
            
            // In production, update database
            // await _userRepository.UpdateTwoFactorEnabled(email, false);
            // await _userRepository.RemoveTwoFactorSecret(email);

            return true;
        }

        public Task<bool> IsTwoFactorEnabledAsync(string email)
        {
            return Task.FromResult(_twoFactorEnabled.GetValueOrDefault(email, false));
        }

        public Task<string> GetTwoFactorSecretAsync(string email)
        {
            return Task.FromResult(_twoFactorSecrets.GetValueOrDefault(email, null));
        }

        public async Task<bool> SendTwoFactorCodeEmailAsync(string email)
        {
            try
            {
                var secretKey = await GetTwoFactorSecretAsync(email);
                if (string.IsNullOrEmpty(secretKey))
                {
                    return false;
                }

                // Generate current TOTP code
                var totpCode = _totpService.GenerateTotpCode(secretKey);
                
                // Send email with the code using existing EmailService
                await SendTwoFactorCodeEmailAsync(email, totpCode);
                
                return true;
            }
            catch
            {
                return false;
            }
        }

        // Admin methods
        public async Task<AdminTwoFactorManagementResponse> AdminEnableTwoFactorAsync(string userEmail, string adminEmail, string adminPassword)
        {
            try
            {
                // Verify admin credentials
                if (!await IsUserAdminAsync(adminEmail, adminPassword))
                {
                    return new AdminTwoFactorManagementResponse
                    {
                        Success = false,
                        Message = "Access denied. Admin credentials required."
                    };
                }

                // Check if user exists
                var user = _securityManager.GetUsers()?.FirstOrDefault(u => u.EMail.Equals(userEmail, StringComparison.OrdinalIgnoreCase));
                if (user == null)
                {
                    return new AdminTwoFactorManagementResponse
                    {
                        Success = false,
                        Message = "User not found"
                    };
                }

                // Check if 2FA is already enabled
                if (await IsTwoFactorEnabledAsync(userEmail))
                {
                    return new AdminTwoFactorManagementResponse
                    {
                        Success = false,
                        Message = "Two-factor authentication is already enabled for this user"
                    };
                }

                // Generate new secret key
                var secretKey = _totpService.GenerateSecretKey();
                
                // Store the secret
                _twoFactorSecrets[userEmail] = secretKey;

                // Generate QR code URL
                var qrCodeUrl = _totpService.GenerateQrCodeUrl(userEmail, secretKey);

                // Send setup email to user using existing EmailService
                await SendTwoFactorSetupEmailAsync(userEmail, secretKey, qrCodeUrl);

                return new AdminTwoFactorManagementResponse
                {
                    Success = true,
                    Message = $"Two-factor authentication enabled for {userEmail}. Setup email sent.",
                    SecretKey = secretKey,
                    QrCodeUrl = qrCodeUrl
                };
            }
            catch (Exception ex)
            {
                return new AdminTwoFactorManagementResponse
                {
                    Success = false,
                    Message = $"Error: {ex.Message}"
                };
            }
        }

        public async Task<AdminTwoFactorManagementResponse> AdminDisableTwoFactorAsync(string userEmail, string adminEmail, string adminPassword)
        {
            try
            {
                // Verify admin credentials
                if (!await IsUserAdminAsync(adminEmail, adminPassword))
                {
                    return new AdminTwoFactorManagementResponse
                    {
                        Success = false,
                        Message = "Access denied. Admin credentials required."
                    };
                }

                // Check if user exists
                var user = _securityManager.GetUsers()?.FirstOrDefault(u => u.EMail.Equals(userEmail, StringComparison.OrdinalIgnoreCase));
                if (user == null)
                {
                    return new AdminTwoFactorManagementResponse
                    {
                        Success = false,
                        Message = "User not found"
                    };
                }

                // Check if 2FA is enabled
                if (!await IsTwoFactorEnabledAsync(userEmail))
                {
                    return new AdminTwoFactorManagementResponse
                    {
                        Success = false,
                        Message = "Two-factor authentication is not enabled for this user"
                    };
                }

                // Disable 2FA
                _twoFactorEnabled[userEmail] = false;
                _twoFactorSecrets.TryRemove(userEmail, out _);

                return new AdminTwoFactorManagementResponse
                {
                    Success = true,
                    Message = $"Two-factor authentication disabled for {userEmail}"
                };
            }
            catch (Exception ex)
            {
                return new AdminTwoFactorManagementResponse
                {
                    Success = false,
                    Message = $"Error: {ex.Message}"
                };
            }
        }

        public async Task<List<UserTwoFactorStatus>> GetAllUsersTwoFactorStatusAsync(string adminEmail, string adminPassword)
        {
            try
            {
                // Verify admin credentials
                if (!await IsUserAdminAsync(adminEmail, adminPassword))
                {
                    throw new UnauthorizedAccessException("Access denied. Admin credentials required.");
                }

                var users = _securityManager.GetUsers();
                if (users == null)
                {
                    return new List<UserTwoFactorStatus>();
                }

                var userStatuses = new List<UserTwoFactorStatus>();
                foreach (var user in users)
                {
                    var isTwoFactorEnabled = await IsTwoFactorEnabledAsync(user.EMail);
                    userStatuses.Add(new UserTwoFactorStatus
                    {
                        Email = user.EMail,
                        FirstName = user.FirstName,
                        LastName = user.LastName,
                        IsTwoFactorEnabled = isTwoFactorEnabled,
                        IsAdmin = user.IsAdmin
                    });
                }

                return userStatuses;
            }
            catch
            {
                return new List<UserTwoFactorStatus>();
            }
        }

        public async Task<bool> IsUserAdminAsync(string email, string password)
        {
            try
            {
                var account = _securityManager.Authenticate(email, password);
                return account?.IsAdmin == true;
            }
            catch
            {
                return false;
            }
        }

        // Helper methods for email sending using existing EmailService
        private async Task SendTwoFactorSetupEmailAsync(string email, string secretKey, string qrCodeUrl)
        {
            var subject = "Two-Factor Authentication Setup - Masterloop Cloud";
            var bodyHtml = GenerateTwoFactorSetupHtml(secretKey, qrCodeUrl);
            
            await _emailService.SendEmailAsync(email, subject, bodyHtml);
        }

        private async Task SendTwoFactorCodeEmailAsync(string email, string totpCode)
        {
            var subject = "Your Two-Factor Authentication Code - Masterloop Cloud";
            var bodyHtml = GenerateTwoFactorCodeHtml(totpCode);
            
            await _emailService.SendEmailAsync(email, subject, bodyHtml);
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