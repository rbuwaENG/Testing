using Masterloop.Core.Types.Devices;

namespace Masterloop.Cloud.BusinessLayer.Managers.Interfaces
{
    public interface ITemplateManager
    {
        DeviceTemplate GetTemplate(string tid);
        int? GetTemplateTenantId(string tid);
        DeviceTemplate[] GetTemplates();
        string[] GetTemplateIDsByTenant(int tenantId);
        bool CreateTemplate(int tenantId, DeviceTemplate template);
        void CreateRMQTemplate(string tid);
        bool UpdateTemplate(DeviceTemplate template);
        bool TIDLengthOK(string TID);
        bool TIDExists(string TID);
        bool TIDContainsValidCharacters(string TID);
        void ValidateTID(string TID);
    }
}