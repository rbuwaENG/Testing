using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Masterloop.Cloud.Core.Security;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Cloud.Core.Tenant;
using Masterloop.Core.Types.Devices;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using System.Linq;
using System.Text;
using Masterloop.Cloud.BusinessLayer.Services.Security;
using System.Collections.Concurrent;

namespace Masterloop.Cloud.BusinessLayer.Managers
{
    public class SecurityManager : ISecurityManager
    {
        private IUserRepository _userRepository;
        private ITenantRepository _tenantRepository;
        private IDeviceRepository _deviceRepository;

        public SecurityManager(IUserRepository userRepository, ITenantRepository tenantRepository, IDeviceRepository deviceRepository)
        {
            _userRepository = userRepository;
            _tenantRepository = tenantRepository;
            _deviceRepository = deviceRepository;
        }

        /// <summary>
        /// Get all users.
        /// </summary>
        /// <returns>Array of all users.</returns>
        public User[] GetUsers()
        {
            var secureUsers = _userRepository.GetAll();
            List<User> users = new List<User>();
            if (secureUsers != null)
            {
                foreach (var secureUser in secureUsers)
                {
                    User user = new User()
                    {
                        EMail = secureUser.EMail,
                        FirstName = secureUser.FirstName,
                        LastName = secureUser.LastName,
                        IsAdmin = secureUser.IsAdmin
                    };
                    users.Add(user);
                }
                return users.ToArray();
            }
            else
            {
                return null;
            }
        }

        /// <summary>
        /// Creates a new user and generates password to be used.
        /// </summary>
        /// <param name="user">New user information.</param>
        /// <returns>Password of newly created user in clear-text.</returns>
        public string CreateUser(SecureUser user)
        {
            if (_userRepository.Get(user.EMail) == null)  // Check that user does not already exist.
            {
                string passwordCleartext = PasswordGenerator.GenerateRandomString(16);
                byte[] salt = CreateSalt(16);
                byte[] bytePassword = Encoding.UTF8.GetBytes(passwordCleartext);
                byte[] hashedPassword = GenerateSaltedHash(bytePassword, salt);
                user.PasswordHashed = Convert.ToBase64String(hashedPassword);
                user.PasswordSalt = Convert.ToBase64String(salt);
                _userRepository.Create(user);
                return passwordCleartext;
            }
            else
            {
                return null;
            }
        }

        /// <summary>
        /// Updates an existing user information.
        /// </summary>
        /// <param name="user">Updated user information.</param>
        /// <returns>True if successfully updated, False otherwise.</returns>
        public bool UpdateUser(User user)
        {
            SecureUser existingUser = _userRepository.Get(user.EMail);
            if (existingUser != null)
            {
                existingUser.FirstName = user.FirstName;
                existingUser.LastName = user.LastName;
                existingUser.IsAdmin = user.IsAdmin;
                return _userRepository.Update(existingUser);
            }
            else
            {
                return false;
            }
        }

        /// <summary>
        /// Deletes an existing non-admin user.
        /// </summary>
        /// <param name="email">User identifier.</param>
        /// <returns>True if successfully deleted, False otherwise.</returns>
        public bool DeleteUser(string email)
        {
            SecureUser user = _userRepository.Get(email);
            if (user != null)
            {
                if (user.IsAdmin)
                {
                    return false;
                }
                else
                {
                    return _userRepository.Delete(email);
                }
            }
            else
            {
                return false;
            }
        }

        /// <summary>
        /// Get account information.
        /// </summary>
        /// <param name="type">Null for all account types, or filtered by account type.</param>
        /// <returns>Array of accounts matching filter.</returns>
        public Account[] GetAccounts(AccountType? type)
        {
            List<Account> accounts = new List<Account>();
            if (!type.HasValue || type == AccountType.User)
            {
                IEnumerable<SecureUser> allUsers = _userRepository.GetAll();
                foreach (SecureUser user in allUsers)
                {
                    Account account = new Account()
                    {
                        AccountId = user.EMail,
                        AccountType = AccountType.User,
                        IsAdmin = user.IsAdmin,
                        Name = $"{user.FirstName} {user.LastName}"
                    };
                    accounts.Add(account);
                }
            }
            else if (!type.HasValue || type == AccountType.Tenant)
            {
                IEnumerable<SecureTenant> allTenants = _tenantRepository.GetAll();
                foreach (SecureTenant tenant in allTenants)
                {
                    Account account = new Account()
                    {
                        AccountId = tenant.Login,
                        AccountType = AccountType.Tenant,
                        IsAdmin = false,
                        Name = tenant.Name
                    };
                    accounts.Add(account);
                }
            }
            else if (!type.HasValue || type == AccountType.Device)
            {
                IEnumerable<SecureDetailedDevice> allDevices = _deviceRepository.GetAll();
                foreach (SecureDetailedDevice device in allDevices)
                {
                    Account account = new Account()
                    {
                        AccountId = device.MID,
                        AccountType = AccountType.Device,
                        IsAdmin = false,
                        Name = device.Name
                    };
                    accounts.Add(account);
                }
            }
            return accounts.ToArray();
        }

        /// <summary>
        /// Get account information for a specified accountId.
        /// </summary>
        /// <param name="accountId">Account identifier (MID, User e-mail or Tenant login).</param>
        /// <returns>Account structure if found, null otherwise.</returns>
        public Account GetAccount(string accountId)
        {
            Account account = null;
            AccountType accountType = ParseAccountType(accountId);
            switch (accountType)
            {
                case AccountType.User:
                    SecureUser user = _userRepository.Get(accountId);
                    account = new Account()
                    {
                        AccountId = accountId,
                        AccountType = AccountType.User,
                        Name = user.FirstName + " " + user.LastName,
                        IsAdmin = user.IsAdmin
                    };
                    break;
                case AccountType.Tenant:
                    SecureTenant tenant = _tenantRepository.GetByLogin(accountId);
                    account = new Account()
                    {
                        AccountId = accountId,
                        AccountType = AccountType.Tenant,
                        Name = tenant.Name,
                        IsAdmin = false
                    };
                    break;
                case AccountType.Device:
                    SecureDetailedDevice device = _deviceRepository.Get(accountId);
                    account = new Account()
                    {
                        AccountId = accountId,
                        AccountType = AccountType.Device,
                        Name = device.Name,
                        IsAdmin = false
                    };
                    break;
            }
            return account;
        }

        /// <summary>
        /// Get user information by e-mail.
        /// </summary>
        /// <param name="email">E-Mail address of user.</param>
        /// <returns>UserInformation object for specified user email.</returns>
        public UserInformation GetUserInformation(string email)
        {
            SecureUser user = _userRepository.Get(email);
            if (user != null)
            {
                UserInformation userInformation = new UserInformation();

                userInformation.EMail = user.EMail;
                userInformation.FirstName = user.FirstName;
                userInformation.LastName = user.LastName;
                userInformation.IsSystemAdmin = user.IsAdmin;

                IEnumerable<TenantPermission> tenants = _tenantRepository.GetAllUserTenants(email);
                if (tenants != null)
                {
                    userInformation.Tenants = tenants.ToArray();
                    List<TemplatePermission> templates = new List<TemplatePermission>();
                    foreach (TenantPermission tenant in tenants)
                    {
                        IEnumerable<string> templateIds = _tenantRepository.GetTenantTemplates(tenant.TenantId);
                        if (templateIds != null)
                        {
                            foreach (string templateId in templateIds)
                            {
                                TemplatePermission template = new TemplatePermission(email, templateId, tenant.CanObserve, tenant.CanControl, tenant.CanAdmin);
                                templates.Add(template);
                            }
                        }
                    }
                    userInformation.Templates = templates.ToArray();
                }

                return userInformation;
            }
            else
            {
                throw new ArgumentException($"GetUserInformation, user not found: {email}");
            }
        }

        /// <summary>
        /// Gets account for specified accountId+password combination.
        /// </summary>
        /// <param name="accountId">Account identifier (MID, E-Mail or Tenant Login).</param>
        /// <param name="password">Corresponding password or pre-shared key.</param>
        /// <returns>Account structure if accountId+password matches existing account, null otherwise.</returns>
        public Account Authenticate(string accountId, string password)
        {
            Account account = null;
            AccountType accountType = ParseAccountType(accountId);
            switch (accountType)
            {
                case AccountType.User:
                    SecureUser user = _userRepository.Get(accountId);
                    if (user != null && AuthorizeHashedPassword(password, user.PasswordHashed, user.PasswordSalt))
                    {
                        account = new Account()
                        {
                            AccountId = accountId,
                            AccountType = AccountType.User,
                            Name = user.FirstName + " " + user.LastName,
                            IsAdmin = user.IsAdmin
                        };
                    }
                    break;
                case AccountType.Tenant:
                    SecureTenant tenant = _tenantRepository.GetByLogin(accountId);
                    if (tenant != null && tenant.PreSharedKey == password)
                    {
                        account = new Account()
                        {
                            AccountId = accountId,
                            AccountType = AccountType.Tenant,
                            Name = tenant.Name,
                            IsAdmin = false
                        };
                    }
                    break;
                case AccountType.Device:
                    SecureDetailedDevice device = _deviceRepository.Get(accountId);
                    if (device != null && device.PreSharedKey == password)
                    {
                        account = new Account()
                        {
                            AccountId = accountId,
                            AccountType = AccountType.Device,
                            Name = device.Name,
                            IsAdmin = false
                        };
                    }
                    break;
            }
            return account;
        }

        /// <summary>
        /// Get all accounts with access to device MID.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <returns>Array of DevicePermission objects.</returns>
        public DevicePermission[] GetDevicePermissionsForDevice(string MID)
        {
            List<DevicePermission> permissions = new List<DevicePermission>();
            Device device = _deviceRepository.Get(MID);
            if (device == null) return null;

            // Add Subscription Users
            SecureTenant tenant = _tenantRepository.GetTenantByTemplate(device.TemplateId);
            if (tenant == null) return null;

            IEnumerable<TenantPermission> users = _tenantRepository.GetAllTenantUsers(tenant.Id);
            foreach (TenantPermission user in users)
            {
                DevicePermission pU = new DevicePermission(user.AccountId, MID, user.CanObserve, user.CanControl, user.CanAdmin);
                permissions.Add(pU);
            }

            // Add Subscription it belongs to
            DevicePermission pS = new DevicePermission(tenant.Login, MID, true, true, true);
            permissions.Add(pS);

            return permissions.ToArray();
        }

        /// <summary>
        /// Get device permission for specified account and MID.
        /// </summary>
        /// <param name="accountId">Account identifier.</param>
        /// <param name="MID">Device identifier.</param>
        /// <returns>DevicePermission object or null if no permission exist for the specified accountId+MID combination.</returns>
        public DevicePermission GetDevicePermissionForAccountAndDevice(string accountId, string MID)
        {
            Device device = _deviceRepository.Get(MID);
            if (device == null) return null;

            SecureTenant tenant = _tenantRepository.GetTenantByTemplate(device.TemplateId);
            if (tenant == null) return null;

            switch (ParseAccountType(accountId))
            {
                case AccountType.User:
                    TenantPermission permission = _tenantRepository.GetTenantUser(tenant.Id, accountId);
                    if (permission != null)
                    {
                        return new DevicePermission(accountId, MID, permission.CanObserve, permission.CanControl, permission.CanAdmin);
                    }
                    break;
                case AccountType.Tenant:
                    if (tenant.Login == accountId)
                    {
                        return new DevicePermission(accountId, MID, true, true, true);
                    }
                    break;
            }
            return null;
        }

        /// <summary>
        /// Get template permission for specified account and template.
        /// </summary>
        /// <param name="accountId">Account identifier.</param>
        /// <param name="templateId">Device identifier.</param>
        /// <returns>TemplatePermission object or null if no permission exists for the specified accountId+templateId combination.</returns>
        public TemplatePermission GetTemplatePermissionForAccountAndTemplate(string accountId, string templateId)
        {
            SecureTenant tenant = _tenantRepository.GetTenantByTemplate(templateId);
            if (tenant == null) return null;

            switch (ParseAccountType(accountId))
            {
                case AccountType.User:
                    TenantPermission permission = _tenantRepository.GetTenantUser(tenant.Id, accountId);
                    if (permission != null)
                    {
                        return new TemplatePermission(accountId, templateId, permission.CanObserve, permission.CanControl, permission.CanAdmin);
                    }
                    break;
                case AccountType.Tenant:
                    if (tenant.Login == accountId)
                    {
                        return new TemplatePermission(accountId, templateId, true, true, true);
                    }
                    break;
            }
            return null;
        }

        /// <summary>
        /// Get all tenants for specified account.
        /// </summary>
        /// <param name="accountId">Account identifier.</param>
        /// <returns>Array of TenantPermission objects.</returns>
        public TenantPermission[] GetTenantPermissionsForAccount(string accountId)
        {
            List<TenantPermission> permissions = new List<TenantPermission>();
            switch (ParseAccountType(accountId))
            {
                case AccountType.User:
                    IEnumerable<TenantPermission> userPermissions = _tenantRepository.GetAllUserTenants(accountId);
                    if (userPermissions != null)
                    {
                        foreach (TenantPermission permission in userPermissions)
                        {
                            permissions.Add(permission);
                        }
                    }
                    break;
                case AccountType.Tenant:
                    SecureTenant tenant = _tenantRepository.GetByLogin(accountId);
                    TenantPermission tp = new TenantPermission(accountId, tenant.Id, true, true, true);
                    permissions.Add(tp);
                    break;
            }
            return permissions.ToArray();
        }

        public AccountType ParseAccountType(string accountId)
        {
            if (IsValidEmail(accountId))
            {
                return AccountType.User;
            }
            else
            {
                if (accountId.Length > 4 && accountId.Substring(0, 4) == "MCS_")
                {
                    return AccountType.Tenant;
                }
                else
                {
                    return AccountType.Device;
                }
            }
        }

        public string GeneratePasswordResetToken(string email)
        {
            SecureUser user = _userRepository.Get(email);
            if (user == null)
                return null;

            string token = Guid.NewGuid().ToString("N"); // Generate a simple token

            // Store token with 1 hour expiration
            var expiry = DateTime.UtcNow.AddHours(1);
            _passwordResetTokens[email] = (token, expiry);

            return token;
        }

        public bool ResetPassword(string email, string token, string newPassword)
        {
            if (!_passwordResetTokens.TryGetValue(email, out var storedToken))
            {
                return false; // No token stored for email
            }

            if (storedToken.Token != token || storedToken.Expiry < DateTime.UtcNow)
            {
                return false; // Token invalid or expired
            }

            SecureUser user = _userRepository.Get(email);
            if (user == null)
            {
                return false; // User not found
            }

            // Generate new salted hash for new password
            byte[] salt = CreateSalt(16);
            byte[] bytePassword = Encoding.UTF8.GetBytes(newPassword);
            byte[] hashedPassword = GenerateSaltedHash(bytePassword, salt);

            user.PasswordSalt = Convert.ToBase64String(salt);
            user.PasswordHashed = Convert.ToBase64String(hashedPassword);

            bool updated = _userRepository.Update(user);

            if (updated)
            {
                // Remove the token to prevent reuse
                _passwordResetTokens.TryRemove(email, out _);
                return true;
            }
            return false;
        }

        #region Internal
        private byte[] CreateSalt(int size)
        {
            RNGCryptoServiceProvider rng = new RNGCryptoServiceProvider();
            byte[] buff = new byte[size];
            rng.GetBytes(buff);
            return buff;
        }

        private byte[] GenerateSaltedHash(byte[] plainText, byte[] salt)
        {
            HashAlgorithm algorithm = new SHA256Managed();
            byte[] plainTextWithSaltBytes = new byte[plainText.Length + salt.Length];
            for (int i = 0; i < plainText.Length; i++)
            {
                plainTextWithSaltBytes[i] = plainText[i];
            }
            for (int i = 0; i < salt.Length; i++)
            {
                plainTextWithSaltBytes[plainText.Length + i] = salt[i];
            }
            return algorithm.ComputeHash(plainTextWithSaltBytes);
        }

        private bool IsValidEmail(string email)
        {
            try
            {
                return Regex.IsMatch(email, @"\A(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)\Z", RegexOptions.IgnoreCase);
            }
            catch
            {
                return false;
            }
        }

        private bool CompareByteArrays(byte[] array1, byte[] array2)
        {
            if (array1.Length != array2.Length)
            {
                return false;
            }
            for (int i = 0; i < array1.Length; i++)
            {
                if (array1[i] != array2[i])
                {
                    return false;
                }
            }
            return true;
        }

        private bool AuthorizeHashedPassword(string passwordGiven, string passwordHashedString, string passwordSaltString)
        {
            byte[] correctPassword = Convert.FromBase64String(passwordHashedString);
            byte[] passwordSalt = Convert.FromBase64String(passwordSaltString);

            // Prepend the salt to the given password and hash it using the same hash function.
            byte[] byteGivenPassword = System.Text.Encoding.UTF8.GetBytes(passwordGiven);
            byte[] saltedGivenPassword = GenerateSaltedHash(byteGivenPassword, passwordSalt);

            // Compare the hash of the given password with the correct hash and return result.
            return CompareByteArrays(saltedGivenPassword, correctPassword);
        }

        private static ConcurrentDictionary<string, (string Token, DateTime Expiry)> _passwordResetTokens  = new ConcurrentDictionary<string, (string, DateTime)>();
        #endregion
    }
}
