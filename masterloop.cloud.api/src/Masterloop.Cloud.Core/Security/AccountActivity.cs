using System;

namespace Masterloop.Cloud.Core.Security
{
    public class AccountActivity
    {
        public AccountType AccountType { get; set; }

        public string AccountId { get; set; }

        public DateTime LatestLoginTimestamp { get; set; }

        public string LatestLoginAddress { get; set; }
    }
}
