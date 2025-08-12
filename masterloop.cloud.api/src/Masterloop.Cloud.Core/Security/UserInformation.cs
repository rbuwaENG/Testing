namespace Masterloop.Cloud.Core.Security
{
    public class UserInformation
    {
        public string EMail { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public bool IsSystemAdmin { get; set; }
        public TenantPermission[] Tenants { get; set; }
        public TemplatePermission[] Templates { get; set; }
    }
}