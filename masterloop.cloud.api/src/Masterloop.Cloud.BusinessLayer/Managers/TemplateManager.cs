using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.BusinessLayer.Services.RMQ;
using Masterloop.Cloud.Core.RMQ;
using Masterloop.Cloud.Core.SystemNotification;
using Masterloop.Cloud.Core.Tenant;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Devices;
using Masterloop.Core.Types.LiveConnect;
using System;

namespace Masterloop.Cloud.BusinessLayer.Managers
{
    public class TemplateManager : ITemplateManager
    {
        ITemplateRepository _templateRepository;
        ITenantRepository _tenantRepository;
        IRMQAdminClient _rmqAdminClient;
        IRMQPublishService _rmqPublishService;

        public TemplateManager(
            ITemplateRepository templateRepository,
            ITenantRepository tenantRepository,
            IRMQAdminClient rmqAdminClient,
            IRMQPublishService rmqPublishService)
        {
            _templateRepository = templateRepository;
            _tenantRepository = tenantRepository;
            _rmqAdminClient = rmqAdminClient;
            _rmqPublishService = rmqPublishService;
        }

        public DeviceTemplate GetTemplate(string tid)
        {
            return _templateRepository.Get(tid);
        }

        public int? GetTemplateTenantId(string tid)
        {
            SecureTenant tenant = _tenantRepository.GetTenantByTemplate(tid);
            if (tenant != null)
            {
                return tenant.Id;
            }
            else
            {
                return null;
            }
        }

        public DeviceTemplate[] GetTemplates()
        {
            return _templateRepository.GetAll() as DeviceTemplate[];
        }

        public string[] GetTemplateIDsByTenant(int tenantId)
        {
            return _tenantRepository.GetTenantTemplates(tenantId) as string[];
        }

        public bool CreateTemplate(int tenantId, DeviceTemplate template)
        {
            if (!TIDExists(template.Id))
            {
                template.Revision = "1";
                _templateRepository.Create(template);
                _tenantRepository.AddTenantTemplate(tenantId, template.Id);

                CreateRMQTemplate(template.Id);

                return true;
            }
            else
            {
                return false;
            }
        }

        public void CreateRMQTemplate(string tid)
        {
            // Create RMQ template exchanges
            string templatePubExchangeName = RMQNameProvider.CreateTemplatePubExchangeName(tid);
            _rmqAdminClient.CreateTopicExchange(templatePubExchangeName);

            string templateSubExchangeName = RMQNameProvider.CreateTemplateSubExchangeName(tid);
            _rmqAdminClient.CreateTopicExchange(templateSubExchangeName);

            // Create binding between device template exchange and historian exchange for all data exchange.
            string historianExchangeName = RMQNameProvider.GetRootExchangeName();
            _rmqAdminClient.CreateBindingBetweenTwoExchanges(templateSubExchangeName, historianExchangeName, BindingKey.GenerateWildcardKey());
        }

        public bool UpdateTemplate(DeviceTemplate template)
        {
            // Increase revision number by 1 since previous save
            DeviceTemplate oldTemplate = _templateRepository.Get(template.Id);
            int newRevisionNo = Int32.Parse(oldTemplate.Revision) + 1;
            template.Revision = newRevisionNo.ToString();
            template.Protocol = oldTemplate.Protocol;  // Updating of protocol currently not supported.

            // Save new template
            if (_templateRepository.Update(template))
            {
                // Send system notification that device template changed
                SystemNotificationTemplateChanged notification = new SystemNotificationTemplateChanged()
                {
                    TID = template.Id
                };
                if (_rmqPublishService.PublishSystemNotification(SystemNotificationCategory.TemplateChanged, notification))
                {
                    return true;
                }
            }
            return false;
        }

        public bool TIDLengthOK(string TID)
        {
            return TID.Length >= 8 && TID.Length <= 16;
        }

        public bool TIDExists(string TID)
        {
            return _templateRepository.Get(TID) != null;
        }

        public bool TIDContainsValidCharacters(string TID)
        {
            string allowableLetters = "abcdefghijklmnopqrstuvwyxzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            foreach (char c in TID)
            {
                // This is using String.Contains for .NET 2 compat.,
                //   hence the requirement for ToString()
                if (!allowableLetters.Contains(c.ToString()))
                    return false;
            }
            return true;
        }

        public void ValidateTID(string TID)
        {
            if (!TIDLengthOK(TID))
            {
                throw new ArgumentException("TID must contain between 8 and 16 characters: " + TID);
            }
            else if (TIDExists(TID))
            {
                throw new ArgumentException("TID already exists: " + TID);
            }
            else if (!TIDContainsValidCharacters(TID))
            {
                throw new ArgumentException("TID contains invalid characters: " + TID + " (must be a-z, 0-9)");
            }
        }
    }
}