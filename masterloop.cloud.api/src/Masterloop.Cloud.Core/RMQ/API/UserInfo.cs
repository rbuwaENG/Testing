namespace Masterloop.Cloud.Core.RMQ.API
{
    public class UserInfo
    {
        public string password { get; private set; }
        public string tags { get; private set; }

        public UserInfo(string password)
        {
            this.password = password;
            tags = string.Empty;
        }
    }
}
