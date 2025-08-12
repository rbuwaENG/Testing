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
        private readonly ISmtpEmailService _emailService;
        private readonly ISecurityManager _securityManager;
        
        // In-memory storage for 2FA secrets - in production, use database
        private static readonly ConcurrentDictionary<string, string> _twoFactorSecrets = new ConcurrentDictionary<string, string>();
        private static readonly ConcurrentDictionary<string, bool> _twoFactorEnabled = new ConcurrentDictionary<string, bool>();

        public TwoFactorAuthService(
            ITotpService totpService,
            ISmtpEmailService emailService,
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

            // Send setup email
            await _emailService.SendTwoFactorSetupEmailAsync(email, secretKey, qrCodeUrl);

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
                
                // Send email with the code
                await _emailService.SendTwoFactorCodeEmailAsync(email, totpCode);
                
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

                // Send setup email to user
                await _emailService.SendTwoFactorSetupEmailAsync(userEmail, secretKey, qrCodeUrl);

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
    }
}