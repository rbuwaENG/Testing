namespace Masterloop.Cloud.Core.RMQ.API
{
    public class TopicPermissionInfo
    {
        public string exchange { get; private set; }
        public string write { get; private set; }
        public string read { get; private set; }

        private const string denyAll = "^$";
        private const string allowAll = ".*";

        public TopicPermissionInfo(string exchange)
        {
            this.exchange = exchange;
            write = read = allowAll;
        }

        public TopicPermissionInfo SetExchange(string resourcesToAllow)
        {
            exchange = resourcesToAllow;
            return this;
        }

        public TopicPermissionInfo SetWrite(string resourcedToAllow)
        {
            write = resourcedToAllow;
            return this;
        }

        public TopicPermissionInfo SetRead(string resourcesToAllow)
        {
            read = resourcesToAllow;
            return this;
        }

        public TopicPermissionInfo DenyAllWrite()
        {
            write = denyAll;
            return this;
        }

        public TopicPermissionInfo DenyAllRead()
        {
            read = denyAll;
            return this;
        }
    }
}