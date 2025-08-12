namespace Masterloop.Cloud.Core.Security
{
    public class Account
    {
        public AccountType AccountType { get; set; }

        public string AccountId { get; set; }

        public string Name { get; set; }

        public bool IsAdmin { get; set; }
    }
}
