namespace Masterloop.Cloud.Core.Security
{
    public class User
    {
        public string EMail { get; set; }

        public string FirstName { get; set; }

        public string LastName { get; set; }

        public bool IsAdmin { get; set; }

        public bool IsTwoFactorEnabled { get; set; }
    }
}