using Masterloop.Core.Types.Devices;
using System;
using System.Collections.Generic;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Cloud.Core.Pulse;
using System.Linq;
using Masterloop.Cloud.BusinessLayer.Services.Security;
using Masterloop.Cloud.BusinessLayer.Services.RMQ;
using Masterloop.Cloud.Core.SystemNotification;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.Core.RMQ;
using Masterloop.Core.Types.LiveConnect;
using Masterloop.Cloud.Core.RMQ.API;

namespace Masterloop.Cloud.BusinessLayer.Managers
{
    public class DeviceManager : IDeviceManager
    {
        private readonly IDeviceRepository _deviceRepository;
        private readonly ITemplateRepository _templateRepository;
        private readonly ITenantRepository _tenantRepository;
        private readonly IPulseRepository _pulseRepository;
        private readonly IRMQAdminClient _rmqAdminClient;
        private readonly IRMQPublishService _rmqPublishService;

        public DeviceManager(IDeviceRepository deviceRepository, ITemplateRepository templateRepository, ITenantRepository tenantRepository, IPulseRepository pulseRepository, IRMQAdminClient rmqAdminClient, IRMQPublishService rmqPublishService)
        {
            _deviceRepository = deviceRepository;
            _templateRepository = templateRepository;
            _tenantRepository = tenantRepository;
            _pulseRepository = pulseRepository;
            _rmqAdminClient = rmqAdminClient;
            _rmqPublishService = rmqPublishService;
        }

        public DetailedDevice[] GetDevices(string[] MIDs, bool includeMetadata)
        {
            SecureDetailedDevice[] secureDevices = _deviceRepository.Get(MIDs);

            if (secureDevices != null && secureDevices.Length > 0)
            {
                List<DetailedDevice> devices = new List<DetailedDevice>();
                foreach (SecureDetailedDevice secureDevice in secureDevices)
                {
                    if (includeMetadata)
                    {
                        secureDevice.Metadata = _templateRepository.Get(secureDevice.TemplateId);
                    }
                    devices.Add(GetAsDetailedDevice(secureDevice));
                }
                return devices.ToArray();
            }
            else
            {
                return null;
            }
        }

        public DetailedDevice GetDevice(string MID, bool includeMetadata)
        {
            SecureDetailedDevice secureDevice = _deviceRepository.Get(MID);
            if (secureDevice != null)
            {
                if (includeMetadata)
                {
                    secureDevice.Metadata = _templateRepository.Get(secureDevice.TemplateId);
                }
                return GetAsDetailedDevice(secureDevice);
            }
            else
            {
                return null;
            }
        }

        public SecureDetailedDevice GetSecureDevice(string MID, bool includeMetadata)
        {
            SecureDetailedDevice device = _deviceRepository.Get(MID);
            if (device != null && includeMetadata)
            {
                device.Metadata = _templateRepository.Get(device.TemplateId);
            }
            return device;
        }

        public DetailedDevice[] GetDevicesByTenant(int tenantId, bool includeMetadata, bool includeDetails)
        {
            List<DetailedDevice> devices = new List<DetailedDevice>();

            IEnumerable<string> templateIds = _tenantRepository.GetTenantTemplates(tenantId);
            if (templateIds != null)
            {
                foreach (string templateId in templateIds)
                {
                    DetailedDevice[] devs = GetDevicesByTemplate(templateId, includeMetadata, includeDetails);
                    if (devs != null && devs.Length > 0)
                    {
                        devices.AddRange(devs);
                    }
                }
            }

            return devices.ToArray();
        }

        public DetailedDevice[] GetDevicesByTemplate(string TID, bool includeMetadata, bool includeDetails)
        {
            IEnumerable<DetailedPulsePeriod> pulsePeriods = null;

            DeviceTemplate template = null;
            IEnumerable<string> MIDs = _deviceRepository.GetMIDsByTemplate(TID);
            if (MIDs == null) return null;
            IEnumerable<SecureDetailedDevice> secureDevs = _deviceRepository.GetByTemplate(TID);
            if (includeMetadata)
            {
                template = _templateRepository.Get(TID);
            }
            if (includeDetails)
            {
                pulsePeriods = _pulseRepository.GetCurrent(MIDs.ToArray(), 0);
            }

            List<DetailedDevice> devices = new List<DetailedDevice>();
            foreach (SecureDetailedDevice secureDev in secureDevs)
            {
                if (includeMetadata)
                {
                    secureDev.Metadata = template;
                }
                if (includeDetails)
                {
                    DetailedPulsePeriod pulsePeriod = pulsePeriods.SingleOrDefault(p => p.MID == secureDev.MID);
                    if (pulsePeriod != null)
                    {
                        secureDev.LatestPulse = pulsePeriod.To;
                    }
                }
                devices.Add(GetAsDetailedDevice(secureDev));
            }

            return devices.ToArray();
        }

        public SecureDetailedDevice CreateDevice(NewDevice newDevice)
        {
            if (newDevice.MID == null)
            {
                newDevice.MID = GetMID();
            }

            if (newDevice.PreSharedKey == null)
            {
                newDevice.PreSharedKey = PasswordGenerator.GenerateRandomString(16);
            }

            SecureDetailedDevice device = new SecureDetailedDevice()
            {
                MID = newDevice.MID,
                Name = newDevice.Name,
                Description = newDevice.Description,
                PreSharedKey = newDevice.PreSharedKey,
                CreatedOn = newDevice.CreatedOn ?? DateTime.UtcNow,
                UpdatedOn = newDevice.UpdatedOn ?? DateTime.UtcNow,
                TemplateId = newDevice.TemplateId,
            };

            return FinalizeCreateDevice(device);
        }

        private SecureDetailedDevice FinalizeCreateDevice(SecureDetailedDevice device)
        {
            // Add to database
            try
            {
                DeviceTemplate template = _templateRepository.Get(device.TemplateId);
                if (template != null)
                {
                    if (_deviceRepository.Create(device) == device.MID)
                    {
                        // Add to Rabbit MQ
                        RMQCreateDevice(device.TemplateId, device.MID, device.PreSharedKey, template.Protocol);
                        return device;
                    }
                }
            }
            catch (Exception)
            {
                try
                {
                    DeleteDevice(device.MID);
                }
                catch (Exception)
                { }
                return null;
            }
            return device;
        }


        public DetailedDevice UpdateDevice(Device updatedDevice)
        {
            SecureDetailedDevice secureDevice = _deviceRepository.Get(updatedDevice.MID);
            if (secureDevice == null) return null;

            // General
            secureDevice.Name = updatedDevice.Name;
            secureDevice.Description = updatedDevice.Description;
            secureDevice.UpdatedOn = DateTime.UtcNow;

            // Has template been changed?
            if (secureDevice.TemplateId != updatedDevice.TemplateId)
            {
                SystemNotificationDeviceTemplateChanged notification = new SystemNotificationDeviceTemplateChanged()
                {
                    MID = updatedDevice.MID,
                    FromTID = secureDevice.TemplateId,
                    ToTID = updatedDevice.TemplateId
                };

                // Update Rabbit MQ template bindings
                RMQChangeTemplateBindings(updatedDevice.MID, secureDevice.TemplateId, updatedDevice.TemplateId);

                // Send system notification that device template changed
                _rmqPublishService.PublishSystemNotification(SystemNotificationCategory.DeviceTemplateChanged, notification);

                secureDevice.TemplateId = updatedDevice.TemplateId;
            }

            // Update in database
            if (_deviceRepository.Update(secureDevice))
            {
                return GetAsDetailedDevice(secureDevice);
            }
            else
            {
                return null;
            }
        }

        public void DeleteDevice(string MID)
        {
            // Remove from database
            _deviceRepository.Delete(MID);

            // Remove from Rabbit MQ
            RMQDeleteDevice(MID);
        }

        public string GetMID()
        {
            string MID;
            do
            {
                MID = PasswordGenerator.GenerateRandomString(8).ToUpper();
            } while (MIDExists(MID));
            return MID;
        }

        public bool MIDLengthOK(string MID)
        {
            return MID.Length >= 8 && MID.Length <= 16;
        }

        public bool MIDExists(string MID)
        {
            return _deviceRepository.Get(MID) != null;
        }

        public bool MIDContainsValidCharacters(string MID)
        {
            string allowableLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            foreach (char c in MID)
            {
                // This is using String.Contains for .NET 2 compat.,
                //   hence the requirement for ToString()
                if (!allowableLetters.Contains(c.ToString()))
                    return false;
            }
            return true;
        }

        public void ValidateMID(string MID)
        {
            if (!MIDLengthOK(MID))
            {
                throw new ArgumentException($"MID must contain between 8 and 16 characters: {MID}");
            }
            else if (!MIDContainsValidCharacters(MID))
            {
                throw new ArgumentException($"MID contains invalid characters: {MID} (must be A-Z, 0-9)");
            }
        }

        private DetailedDevice GetAsDetailedDevice(SecureDetailedDevice sdd)
        {
            return new DetailedDevice()
            {
                TemplateId = sdd.TemplateId,
                MID = sdd.MID,
                Name = sdd.Name,
                Description = sdd.Description,
                CreatedOn = sdd.CreatedOn,
                UpdatedOn = sdd.UpdatedOn,
                LatestPulse = sdd.LatestPulse,
                Metadata = sdd.Metadata
            };
        }

        public void RMQCreateDevice(string TID, string MID, string PSK, DeviceProtocolType protocol = DeviceProtocolType.None)
        {
            if (protocol == DeviceProtocolType.None)
            {
                DeviceTemplate template = _templateRepository.Get(TID);
                if (template != null)
                {
                    protocol = template.Protocol;
                }
                else
                {
                    throw new ArgumentException($"Template with TID {TID} was not found.");
                }
            }

            // Create device exchange
            string deviceExchangeName = RMQNameProvider.CreateDeviceExchangeName(MID);
            _rmqAdminClient.CreateTopicExchange(deviceExchangeName);

            // Configure RMQ for AMQP based devices
            if (protocol == DeviceProtocolType.AMQP || protocol == DeviceProtocolType.ALL)
            {
                string deviceQueueName = RMQNameProvider.CreateDeviceAMQPQueueName(MID);
                _rmqAdminClient.CreateQueue(deviceQueueName);

                // Create binding between device exchange and device queue for commands and pulses to be received.
                _rmqAdminClient.CreateBindingBetweenExchangeAndQueue(deviceExchangeName, deviceQueueName, BindingKey.GenerateDeviceCommandBindingKey(MID));
                _rmqAdminClient.CreateBindingBetweenExchangeAndQueue(deviceExchangeName, deviceQueueName, BindingKey.GenerateDeviceApplicationsPulseBindingKey(MID));
            }

            // Configure RMQ for MQTT based devices
            if (protocol == DeviceProtocolType.MQTT || protocol == DeviceProtocolType.ALL)
            {
                // Create binding between MQTT Inbox topic and device exchange.
                _rmqAdminClient.CreateBindingBetweenTwoExchanges(RMQNameProvider.GetMqttInboxExchangeName(), deviceExchangeName, BindingKey.GenerateDeviceBindingKey(MID));

                // Create binding between device exchange and MQTT Outbox topic.
                _rmqAdminClient.CreateBindingBetweenTwoExchanges(deviceExchangeName, RMQNameProvider.GetMqttOutboxExchangeName(), BindingKey.GenerateDeviceBindingKey(MID));
            }

            // Create bindings between template publishing exchange and device exchange.
            string templatePubExchangeName = RMQNameProvider.CreateTemplatePubExchangeName(TID);
            _rmqAdminClient.CreateBindingBetweenTwoExchanges(templatePubExchangeName, deviceExchangeName, BindingKey.GenerateDeviceCommandBindingKey(MID));
            _rmqAdminClient.CreateBindingBetweenTwoExchanges(templatePubExchangeName, deviceExchangeName, BindingKey.GenerateDeviceApplicationsPulseBindingKey(MID));

            // Create bindings between device exchange and template subscription exchange.
            string templateSubExchangeName = RMQNameProvider.CreateTemplateSubExchangeName(TID);
            _rmqAdminClient.CreateBindingBetweenTwoExchanges(deviceExchangeName, templateSubExchangeName, BindingKey.GenerateDeviceBindingKey(MID));

            if (protocol == DeviceProtocolType.AMQP || protocol == DeviceProtocolType.MQTT || protocol == DeviceProtocolType.ALL)
            {
                RMQCreateDeviceAccount(MID, PSK, protocol);
            }
        }

        public void RMQCreateDeviceAccount(string MID, string PSK, DeviceProtocolType protocol)
        {
            // Create device account.
            _rmqAdminClient.CreateUser(MID, PSK);

            // Create device user account
            RMQCreateDevicePermissions(MID, protocol);
        }

        private void RMQCreateDevicePermissions(string MID, DeviceProtocolType protocol)
        {
            if (protocol == DeviceProtocolType.AMQP)
            {
                string exchangeName = RMQNameProvider.CreateDeviceExchangeName(MID);
                string queueName = RMQNameProvider.CreateDeviceAMQPQueueName(MID);

                string configPermissions = $"^$";
                string readPermissions = $"^({queueName})$";
                string writePermissions = $"^({exchangeName})$";

                PermissionInfo permissionInfo = new PermissionInfo()
                                        .SetConfigure(configPermissions)
                                        .SetRead(readPermissions)
                                        .SetWrite(writePermissions);
                _rmqAdminClient.CreateUserPermission(MID, permissionInfo);
            }
            else if (protocol == DeviceProtocolType.MQTT)
            {
                string mqttTopic = RMQNameProvider.GetMqttExchangeName();
                string mqttSubscription = RMQNameProvider.CreateDeviceMQTTQueueName(MID);

                string configPermissions = $"^({mqttTopic}|{mqttSubscription})$";
                string readPermissions = $"^({mqttTopic}|{mqttSubscription})$";
                string writePermissions = $"^({mqttTopic}|{mqttSubscription})$";

                PermissionInfo permissionInfo = new PermissionInfo()
                                        .SetConfigure(configPermissions)
                                        .SetRead(readPermissions)
                                        .SetWrite(writePermissions);
                _rmqAdminClient.CreateUserPermission(MID, permissionInfo);

                TopicPermissionInfo topicPermissionInfo = new TopicPermissionInfo(mqttTopic)
                    .SetRead($"^({MID}.*|P)$")
                    .SetWrite($"^{MID}.*");
                _rmqAdminClient.CreateTopicPermission(MID, topicPermissionInfo);
            }
            else if (protocol == DeviceProtocolType.ALL)
            {
                string exchangeName = RMQNameProvider.CreateDeviceExchangeName(MID);
                string queueName = RMQNameProvider.CreateDeviceAMQPQueueName(MID);
                string mqttTopic = RMQNameProvider.GetMqttExchangeName();
                string mqttSubscription = RMQNameProvider.CreateDeviceMQTTQueueName(MID);

                string configPermissions = $"^({mqttTopic}|{mqttSubscription})$";
                string readPermissions = $"^({queueName}|{mqttTopic}|{mqttSubscription})$";
                string writePermissions = $"^({exchangeName}|{mqttTopic}|{mqttSubscription})$";

                PermissionInfo permissionInfo = new PermissionInfo()
                                        .SetConfigure(configPermissions)
                                        .SetRead(readPermissions)
                                        .SetWrite(writePermissions);
                _rmqAdminClient.CreateUserPermission(MID, permissionInfo);

                TopicPermissionInfo topicPermissionInfo = new TopicPermissionInfo(mqttTopic)
                    .SetRead($"^({MID}.*|P)$")
                    .SetWrite($"^{MID}.*");
                _rmqAdminClient.CreateTopicPermission(MID, topicPermissionInfo);
            }
        }

        private void RMQChangeTemplateBindings(string MID, string fromTID, string toTID)
        {
            string devX = RMQNameProvider.CreateDeviceExchangeName(MID);
            string oldPubX = RMQNameProvider.CreateTemplatePubExchangeName(fromTID);
            string oldSubX = RMQNameProvider.CreateTemplateSubExchangeName(fromTID);
            RMQDeleteExchangeBinding(oldPubX, devX);  // MID.C.# + MID.P.#
            RMQDeleteExchangeBinding(devX, oldSubX);  // MID.#

            string newPubX = RMQNameProvider.CreateTemplatePubExchangeName(toTID);
            string newSubX = RMQNameProvider.CreateTemplateSubExchangeName(toTID);
            _rmqAdminClient.CreateBindingBetweenTwoExchanges(newPubX, devX, BindingKey.GenerateDeviceCommandBindingKey(MID));
            _rmqAdminClient.CreateBindingBetweenTwoExchanges(newPubX, devX, BindingKey.GenerateDeviceApplicationsPulseBindingKey(MID));

            _rmqAdminClient.CreateBindingBetweenTwoExchanges(devX, newSubX, BindingKey.GenerateDeviceBindingKey(MID));
        }

        private void RMQDeleteExchangeBinding(string sourceExchange, string destinationExchange, string routingKey = null)
        {
            Binding[] bindings = _rmqAdminClient.GetBindingsWithDestination(destinationExchange).ToArray();
            if (bindings != null && bindings.Length > 0)
            {
                foreach (Binding binding in bindings)
                {
                    if (binding.source != sourceExchange)
                    {
                        continue;
                    }
                    if (routingKey != null && binding.routing_key != routingKey)
                    {
                        continue;
                    }
                    _rmqAdminClient.DeleteBinding(binding);
                }
            }
        }

        private void RMQDeleteDevice(string MID)
        {
            // Delete device exchange
            string deviceExchangeName = RMQNameProvider.CreateDeviceExchangeName(MID);
            _rmqAdminClient.DeleteExchange(deviceExchangeName);

            // Delete device queue
            string deviceQueueName = RMQNameProvider.CreateDeviceAMQPQueueName(MID);
            _rmqAdminClient.DeleteQueue(deviceQueueName);

            // Delete device user account
            _rmqAdminClient.DeleteUser(MID);
        }
    }
}