namespace Masterloop.Cloud.Core.Security
{
    public class TemplatePermission : ObjectPermission
    {
        public TemplatePermission(string accountId, string templateId, bool canObserve, bool canControl, bool canAdmin)
            : base(canObserve, canControl, canAdmin)
        {
            AccountId = accountId;
            TemplateId = templateId;
        }

        public readonly string AccountId;

        public readonly string TemplateId;
    }
}
