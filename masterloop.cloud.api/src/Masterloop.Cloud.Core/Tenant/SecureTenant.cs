namespace Masterloop.Cloud.Core.Tenant
{
    public class SecureTenant : Tenant
    {
        public string Login { get; set; }
        public string PreSharedKey { get; set; }
    }
}
