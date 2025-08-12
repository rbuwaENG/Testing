namespace Masterloop.Cloud.Core.RMQ.API
{
    public class PermissionInfo
    {
        public string configure { get; private set; }
        public string write { get; private set; }
        public string read { get; private set; }

        private const string denyAll = "^$";
        private const string allowAll = ".*";

        public PermissionInfo()
        {
            configure = write = read = allowAll;
        }

        public PermissionInfo SetConfigure(string resourcesToAllow)
        {
            configure = resourcesToAllow;
            return this;
        }

        public PermissionInfo SetWrite(string resourcedToAllow)
        {
            write = resourcedToAllow;
            return this;
        }

        public PermissionInfo SetRead(string resourcesToAllow)
        {
            read = resourcesToAllow;
            return this;
        }

        public PermissionInfo DenyAllConfigure()
        {
            configure = denyAll;
            return this;
        }

        public PermissionInfo DenyAllWrite()
        {
            write = denyAll;
            return this;
        }

        public PermissionInfo DenyAllRead()
        {
            read = denyAll;
            return this;
        }
    }
}
