namespace Masterloop.Cloud.Core.Tenant
{
    public class Tenant
    {
        public int Id { get; set; }

        public string Name { get; set; }

        public AddOnFeature[] Features { get; set; }

        public string[] TemplateIds { get; set; }
    }
}
