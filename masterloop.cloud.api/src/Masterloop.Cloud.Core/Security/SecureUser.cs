namespace Masterloop.Cloud.Core.Security
{
    public class SecureUser : User
    {
        public string PasswordHashed { get; set; }

        public string PasswordSalt { get; set; }

        public bool IsTwoFactorEnabled { get; set; }
    }
}