using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.BusinessLayer.Services.RMQ;
using Masterloop.Cloud.BusinessLayer.Services.Security;
using Masterloop.Cloud.Core.Node;
using Masterloop.Cloud.Core.RMQ;
using Masterloop.Cloud.Core.RMQ.API;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Base;
using Masterloop.Core.Types.Devices;
using Masterloop.Core.Types.LiveConnect;
using Masterloop.Core.Types.Observations;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;

namespace Masterloop.Cloud.BusinessLayer.Managers
{
    public class LiveConnectionManager : ILiveConnectionManager
    {
        private readonly IRMQAdminClient _rmqAdminClient;
        private readonly IRMQPublishService _rmqPublishService;
        private readonly IDeviceRepository _deviceRepository;
        private readonly ITemplateRepository _templateRepository;
        private readonly IObservationRepository _observationRepository;
        private readonly INodeRepository _nodeRepository;

        private const int _DEFAULT_API_HTTP_PORT = 80;
        private const int _DEFAULT_API_HTTPS_PORT = 443;
        private const int _DEFAULT_AMQP_PORT = 5672;
        private const int _DEFAULT_AMQPS_PORT = 5671;
        private const string _DEFAULT_AMQP_VHOST = "/";
        private const int _DEFAULT_MQTT_PORT = 1883;
        private const int _DEFAULT_MQTTS_PORT = 8883;
        private const int _DEFAULT_WS_PORT = 80;
        private const int _DEFAULT_WSS_PORT = 443;

        private const int _PASSWD_LENGTH = 32;

        private const int _TEMPORARY_QUEUE_TTL_MILLISECONDS = 2 * 60 * 1000;
        private const int _PERSISTENT_QUEUE_TTL_MILLISECONDS = 12 * 60 * 60 * 1000;

        public LiveConnectionManager(IRMQAdminClient rmqAdminClient, IRMQPublishService rmqPublishService, IDeviceRepository deviceRepository, ITemplateRepository templateRepository, IObservationRepository observationRepository, INodeRepository nodeRepository)
        {
            _rmqAdminClient = rmqAdminClient;
            _rmqPublishService = rmqPublishService;
            _deviceRepository = deviceRepository;
            _templateRepository = templateRepository;
            _observationRepository = observationRepository;
            _nodeRepository = nodeRepository;
        }

        public DeviceConnection GetDeviceConnection(string MID)
        {
            DeviceNodeConfiguration config = _nodeRepository.Get(MID) as DeviceNodeConfiguration;
            if (config != null)
            {
                DetailedDevice device = _deviceRepository.Get(MID);
                if (device != null)
                {
                    DeviceTemplate template = _templateRepository.Get(device.TemplateId);
                    if (template != null)
                    {
                        DeviceConnection deviceConnect = new DeviceConnection();
                        switch (template.Protocol)
                        {
                            case DeviceProtocolType.AMQP:
                            case DeviceProtocolType.ALL:
                                deviceConnect.Node = GetDeviceAMQPNode(MID, config);
                                break;
                            case DeviceProtocolType.MQTT:
                                deviceConnect.Node = GetDeviceMQTTNode(config);
                                break;
                        }
                        deviceConnect.ServerTime = DateTime.UtcNow;
                        deviceConnect.BackoffSeconds = config.BackoffSeconds;

                        return deviceConnect;
                    }
                }
            }
            return null;
        }

        public LiveConnectionDetails CreateTemporaryEndpoint(string userId, string protocol, LiveAppRequest[] requests)
        {
            Guid session = Guid.NewGuid();
            LiveConnectionDetails details = GetLiveConnectionDetails(userId, protocol);
            details.QueueName = RMQNameProvider.GetTemporaryQueueName(userId, session);
            details.ExchangeName = RMQNameProvider.GetTemporaryExchangeName(userId, session);
            details.Username = details.QueueName;
            details.Password = PasswordGenerator.GenerateRandomString(_PASSWD_LENGTH);

            _rmqAdminClient.CreateUser(details.Username, details.Password);
            PermissionInfo permissionInfo = new PermissionInfo()
                .DenyAllConfigure()
                .SetRead(details.QueueName)
                .SetWrite(details.ExchangeName);
            _rmqAdminClient.CreateUserPermission(details.Username, permissionInfo);

            _rmqAdminClient.CreateShortlivedTopicExchange(details.ExchangeName);
            _rmqAdminClient.CreateShortlivedQueue(details.QueueName, _TEMPORARY_QUEUE_TTL_MILLISECONDS);

            // Put current observations into queue (if requested)
            if (requests.Count(r => r.InitObservationValues) > 0)
            {
                InitQueueWithCurrentObservations(requests, details.QueueName);
            }

            // Create bindings between devices and user session queue
            foreach (LiveAppRequest request in requests)
            {
                string pubExchangeName, subExchangeName;
                if (request.TID != null && request.MID == null)
                {
                    pubExchangeName = RMQNameProvider.CreateTemplatePubExchangeName(request.TID);
                    subExchangeName = RMQNameProvider.CreateTemplateSubExchangeName(request.TID);
                }
                else if (request.TID == null && request.MID != null)
                {
                    pubExchangeName = RMQNameProvider.CreateDeviceExchangeName(request.MID);
                    subExchangeName = RMQNameProvider.CreateDeviceExchangeName(request.MID);
                }
                else
                {
                    throw new ArgumentException("Either TID or MID must have an assigned value (but not both).");
                }

                CreateRequestBindings(request, details.QueueName, details.ExchangeName, pubExchangeName, subExchangeName);
            }

            return details;
        }

        public void DeleteTemporaryEndpoint(string userId, Guid key)
        {
            string queueName = RMQNameProvider.GetTemporaryQueueName(userId, key);
            _rmqAdminClient.DeleteQueue(queueName);
            string exchangeName = RMQNameProvider.GetTemporaryExchangeName(userId, key);
            _rmqAdminClient.DeleteExchange(exchangeName);
            _rmqAdminClient.DeleteUser(queueName);
        }

        public LiveConnectionDetails GetPersistentEndpoint(string userId, string subscriptionKey, string protocol)
        {
            LiveConnectionDetails details = GetLiveConnectionDetails(userId, protocol);
            details.QueueName = RMQNameProvider.GetPersistentQueueName(userId, subscriptionKey);
            details.ExchangeName = RMQNameProvider.GetPersistentExchangeName(userId, subscriptionKey);
            details.Username = details.QueueName;
            details.Password = PasswordGenerator.GenerateRandomString(_PASSWD_LENGTH);

            // Check that subscription queue and exchange exists, abort if not.
            if (_rmqAdminClient.GetQueue(details.QueueName) == null || _rmqAdminClient.GetExchange(details.ExchangeName) == null)
            {
                throw new ArgumentException("Subscription key not found. Remember to create persistent subscription before connecting to it.", subscriptionKey);
            }

            // Ensure user exists and generate a new password.
            _rmqAdminClient.CreateUser(details.Username, details.Password);

            // Set user permissions.
            PermissionInfo permissionInfo = new PermissionInfo()
                .DenyAllConfigure()
                .SetRead(details.QueueName)
                .SetWrite(details.ExchangeName);
            _rmqAdminClient.CreateUserPermission(details.Username, permissionInfo);

            return details;
        }

        public void CreatePersistentEndpoint(string userId, LivePersistentSubscriptionRequest request)
        {
            string persistentExchangeName = RMQNameProvider.GetPersistentExchangeName(userId, request.SubscriptionKey);
            string whitelistExchangeName = RMQNameProvider.GetWhitelistExchangeName(userId, request.SubscriptionKey);
            string persistentQueueName = RMQNameProvider.GetPersistentQueueName(userId, request.SubscriptionKey);

            // Check if already exists, and delete in that case.
            if (_rmqAdminClient.GetExchange(persistentExchangeName) != null)
            {
                _rmqAdminClient.DeleteExchange(persistentExchangeName);
            }
            if (_rmqAdminClient.GetExchange(whitelistExchangeName) != null)
            {
                _rmqAdminClient.DeleteExchange(whitelistExchangeName);
            }
            if (_rmqAdminClient.GetQueue(persistentQueueName) != null)
            {
                _rmqAdminClient.DeleteQueue(persistentQueueName);
            }

            // Create persistent exchange with long TTL.
            _rmqAdminClient.CreateShortlivedTopicExchange(persistentExchangeName, _PERSISTENT_QUEUE_TTL_MILLISECONDS, true);

            // Create persistent queue with long TTL.
            _rmqAdminClient.CreateShortlivedQueue(persistentQueueName, _PERSISTENT_QUEUE_TTL_MILLISECONDS, true);

            // Create bindings between devices and user session queue.
            if (request.TID != null && request.MIDs == null)  // Do not use whitelist, bind to template pub/sub exchanges directly.
            {
                string pubExchangeName = RMQNameProvider.CreateTemplatePubExchangeName(request.TID);
                string subExchangeName = RMQNameProvider.CreateTemplateSubExchangeName(request.TID);
                CreateRequestBindings(request, persistentQueueName, persistentExchangeName, pubExchangeName, subExchangeName);
            }
            else if (request.TID != null && request.MIDs != null)  // Use whitelist and template pub/sub exchanges.
            {
                // Create devices whitelist exchange with long TTL.
                _rmqAdminClient.CreateTopicExchange(whitelistExchangeName);

                // Create bindings for objects between persistent queue/exchange and whitelist.
                CreateRequestBindings(request, persistentQueueName, persistentExchangeName, whitelistExchangeName, whitelistExchangeName);

                // Create binding between template pub/sub exchanges and whitelist.
                foreach (string mid in request.MIDs)
                {
                    AddDeviceToWhitelist(userId, request.SubscriptionKey, request.TID, mid);
                }
            }
            else
            {
                throw new ArgumentException("Either TID or MID must have an assigned value (but not both).");
            }
        }

        public bool WhitelistExists(string userId, string subscriptionKey)
        {
            string whitelistExchangeName = RMQNameProvider.GetWhitelistExchangeName(userId, subscriptionKey);
            return _rmqAdminClient.GetExchange(whitelistExchangeName) != null;
        }

        public void AddDeviceToWhitelist(string userId, string subscriptionKey, string tid, string mid)
        {
            string templatePubExchangeName = RMQNameProvider.CreateTemplatePubExchangeName(tid);
            string templateSubExchangeName = RMQNameProvider.CreateTemplateSubExchangeName(tid);
            string whitelistExchangeName = RMQNameProvider.GetWhitelistExchangeName(userId, subscriptionKey);

            // Create binding between Template Subscription and Whitelist
            _rmqAdminClient.CreateBindingBetweenTwoExchanges(templateSubExchangeName, whitelistExchangeName, BindingKey.GenerateDeviceBindingKey(mid));

            // Remove binding between Whitelist and Template Publish
            _rmqAdminClient.CreateBindingBetweenTwoExchanges(whitelistExchangeName, templatePubExchangeName, BindingKey.GenerateDeviceBindingKey(mid));
        }

        public void RemoveDeviceFromWhitelist(string userId, string subscriptionKey, string tid, string mid)
        {
            string templatePubExchangeName = RMQNameProvider.CreateTemplatePubExchangeName(tid);
            string templateSubExchangeName = RMQNameProvider.CreateTemplateSubExchangeName(tid);
            string whitelistExchangeName = RMQNameProvider.GetWhitelistExchangeName(userId, subscriptionKey);
            string routingKey = BindingKey.GenerateDeviceBindingKey(mid);

            // Remove binding between Template Subscription and Whitelist
            IEnumerable<Binding> bindings = _rmqAdminClient.GetBindingsWithDestination(whitelistExchangeName);
            if (bindings != null && bindings.Any(b => b.source == templateSubExchangeName && b.routing_key == routingKey))
            {
                _rmqAdminClient.DeleteBinding(bindings.Single(b => b.source == templateSubExchangeName && b.routing_key == routingKey));
            }

            // Remove binding between Whitelist and Template Publish
            bindings = _rmqAdminClient.GetBindingsWithSource(whitelistExchangeName);
            if (bindings != null && bindings.Any(b => b.destination == templatePubExchangeName && b.routing_key == routingKey))
            {
                _rmqAdminClient.DeleteBinding(bindings.Single(b => b.destination == templatePubExchangeName && b.routing_key == routingKey));
            }
        }

        public void DeletePersistentEndpoint(string userId, string subscriptionKey)
        {
            string persistentExchangeName = RMQNameProvider.GetPersistentExchangeName(userId, subscriptionKey);
            string persistentQueueName = RMQNameProvider.GetPersistentQueueName(userId, subscriptionKey);
            string whitelistExchangeName = RMQNameProvider.GetWhitelistExchangeName(userId, subscriptionKey);

            _rmqAdminClient.DeleteExchange(persistentExchangeName);
            _rmqAdminClient.DeleteQueue(persistentQueueName);
            try
            {
                _rmqAdminClient.DeleteUser(persistentQueueName);
                _rmqAdminClient.DeleteExchange(whitelistExchangeName);  // Does not necessarily exist.
            }
            catch (Exception) { }
        }

        private void InitQueueWithCurrentObservations(LiveAppRequest[] requests, string queueName)
        {
            string initExchangeName = queueName + ".Init";  //TODO: Check if this is really necessary - why not use device Exchange instead?
            _rmqAdminClient.CreateShortlivedTopicExchange(initExchangeName);
            _rmqAdminClient.CreateDirectBindingBetweenExchangeAndQueue(initExchangeName, queueName);

            List<ObservationMessage> messages = new List<ObservationMessage>();

            foreach (LiveAppRequest request in requests)
            {
                List<DetailedDevice> devices = new List<DetailedDevice>();
                if (request.TID != null)
                {
                    IEnumerable<DetailedDevice> devs = _deviceRepository.GetByTemplate(request.TID);
                    if (devs != null)
                    {
                        DeviceTemplate template = _templateRepository.Get(request.TID);
                        if (template != null)
                        {
                            foreach (DetailedDevice dev in devs)
                            {
                                dev.Metadata = template;
                                devices.Add(dev);
                            }
                        }
                    }
                }
                else if (request.MID != null)
                {
                    DetailedDevice dev = _deviceRepository.Get(request.MID);
                    DeviceTemplate template = _templateRepository.Get(request.TID);
                    if (dev != null && template != null)
                    {
                        dev.Metadata = template;
                        devices.Add(dev);
                    }
                }
                foreach (DetailedDevice device in devices)
                {
                    int[] observationIds = null;
                    if (request.ConnectAllObservations)
                    {
                        observationIds = device.Metadata.Observations.Select(o => o.Id).ToArray();
                    }
                    else
                    {
                        observationIds = request.ObservationIds;
                    }
                    if (observationIds != null & observationIds.Length > 0)
                    {
                        Dictionary<int, DataType> observationTypes = new Dictionary<int, DataType>();
                        foreach (int observationId in observationIds)
                        {
                            observationTypes[observationId] = device.Metadata.Observations.Single(o => o.Id == observationId).DataType;
                        }

                        // Get current observations, send to temporary exchange
                        ExpandedObservationValue[] currentValues = _observationRepository.GetCurrent(device.MID, observationTypes);
                        foreach (ExpandedObservationValue c in currentValues)
                        {
                            ObservationMessage msg = new ObservationMessage()
                            {
                                MID = request.MID,
                                ObservationId = c.Id,
                                ObservationType = c.DataType,
                                Observation = c.ToObservation()
                            };
                            messages.Add(msg);
                        }
                    }
                }
            }
            _rmqPublishService.PublishObservations(messages.ToArray(), initExchangeName, _TEMPORARY_QUEUE_TTL_MILLISECONDS, false);
            _rmqAdminClient.DeleteExchange(initExchangeName);
        }

        private LiveConnectionDetails GetLiveConnectionDetails(string userId, string protocol)
        {
            DeviceNodeConfiguration config = _nodeRepository.Get(userId) as DeviceNodeConfiguration;
            if (config == null) throw new Exception("Device node configuration not found.");

            LiveConnectionDetails details = new LiveConnectionDetails();
            details.Server = config.MQHost;
            switch (protocol.ToUpper())
            {
                case "AMQP":
                    details.Port = config.AMQPPort ?? _DEFAULT_AMQP_PORT;
                    details.UseSsl = false;
                    details.VirtualHost = config.AMQPVHost ?? _DEFAULT_AMQP_VHOST;
                    break;
                case "AMQPS":
                    details.Port = config.AMQPSPort ?? _DEFAULT_AMQPS_PORT;
                    details.UseSsl = true;
                    details.VirtualHost = config.AMQPVHost ?? _DEFAULT_AMQP_VHOST;
                    break;
                case "WS":
                    details.Port = config.WSPort ?? _DEFAULT_WS_PORT;
                    details.UseSsl = false;
                    break;
                case "WSS":
                    details.Port = config.WSSPort ?? _DEFAULT_WSS_PORT;
                    details.UseSsl = true;
                    break;
                default:
                    throw new ArgumentException($"Unknown protocol type: {protocol}");
            }
            return details;
        }

        private void CreateRequestBindings(LiveRequest request, string userQueueName, string userExchangeName, string pubExchangeName, string subExchangeName)
        {
            if (request.ConnectAllCommands && request.ConnectAllObservations && request.ReceiveDevicePulse)
            {
                string key = BindingKey.GenerateWildcardKey();

                // Bind messages from subscription exchange to users queue (observation, command responses, device pulse)
                _rmqAdminClient.CreateBindingBetweenExchangeAndQueue(subExchangeName, userQueueName, key);

                // Bind messages from user session exchange to publishing exchange (commands, application pulse)
                _rmqAdminClient.CreateBindingBetweenTwoExchanges(userExchangeName, pubExchangeName, key);
            }
            else
            {
                if (request.ReceiveDevicePulse)
                {
                    // Bind device pulse messages from subscription exchange to user session queue
                    string key = BindingKey.GeneratePulseBindingKey();
                    _rmqAdminClient.CreateBindingBetweenExchangeAndQueue(subExchangeName, userQueueName, key);
                }

                if (request.PulseId.HasValue)
                {
                    // Bind application pulse messages from user session exchange to publishing exchange
                    string key = BindingKey.GeneratePulseBindingKey(request.PulseId.Value);
                    _rmqAdminClient.CreateBindingBetweenTwoExchanges(userExchangeName, pubExchangeName, key);
                }

                if (request.ConnectAllCommands)
                {
                    // Bind messages from subscription exchange to users queue (commands, command responses)
                    string key = BindingKey.GenerateCommandBindingKey();
                    _rmqAdminClient.CreateBindingBetweenExchangeAndQueue(subExchangeName, userQueueName, key);
                    key = BindingKey.GenerateCommandResponseBindingKey();
                    _rmqAdminClient.CreateBindingBetweenExchangeAndQueue(subExchangeName, userQueueName, key);

                    // Bind messages from user session exchange to publishing exchange (commands)
                    key = BindingKey.GenerateCommandBindingKey();
                    _rmqAdminClient.CreateBindingBetweenTwoExchanges(userExchangeName, pubExchangeName, key);
                }
                else
                {
                    if (request.CommandIds != null)
                    {
                        foreach (int commandId in request.CommandIds)
                        {
                            // Bind messages from subscription exchange to users queue (commands, command responses)
                            string key = BindingKey.GenerateCommandBindingKey(commandId);
                            _rmqAdminClient.CreateBindingBetweenExchangeAndQueue(subExchangeName, userQueueName, key);
                            key = BindingKey.GenerateCommandResponseBindingKey(commandId);
                            _rmqAdminClient.CreateBindingBetweenExchangeAndQueue(subExchangeName, userQueueName, key);

                            // Bind messages from user session exchange to publishing exchange (commands)
                            key = BindingKey.GenerateCommandBindingKey(commandId);
                            _rmqAdminClient.CreateBindingBetweenTwoExchanges(userExchangeName, pubExchangeName, key);
                        }
                    }
                }

                if (request.ConnectAllObservations)
                {
                    // Bind messages from subscription exchange to users queue (observation)
                    string key = BindingKey.GenerateObservationBindingKey();
                    _rmqAdminClient.CreateBindingBetweenExchangeAndQueue(subExchangeName, userQueueName, key);
                }
                else
                {
                    if (request.ObservationIds != null)
                    {
                        foreach (int observationId in request.ObservationIds)
                        {
                            // Bind messages from subscription exchange to users queue (observation)
                            string key = BindingKey.GenerateObservationBindingKey(observationId);
                            _rmqAdminClient.CreateBindingBetweenExchangeAndQueue(subExchangeName, userQueueName, key);
                        }
                    }
                }
            }
        }

        private DeviceNodeAMQP GetDeviceAMQPNode(string mid, NodeConfiguration config)
        {
            DeviceNodeAMQP details = new DeviceNodeAMQP();
            details.APIHost = config.APIHost;
            details.APIPortUEnc = config.APIHTTPPort ?? _DEFAULT_API_HTTP_PORT;
            details.APIPortEnc = config.APIHTTPSPort ?? _DEFAULT_API_HTTPS_PORT;
            details.MQHost = config.MQHost;
            details.MQPortUEnc = config.AMQPPort ?? _DEFAULT_AMQP_PORT;
            details.MQPortEnc = config.AMQPSPort ?? _DEFAULT_AMQPS_PORT;
            details.AMQPVHost = config.AMQPVHost ?? _DEFAULT_AMQP_VHOST;
            details.AMQPQueue = RMQNameProvider.CreateDeviceAMQPQueueName(mid);
            details.AMQPExchange = RMQNameProvider.CreateDeviceExchangeName(mid);
            return details;
        }

        private DeviceNodeMQTT GetDeviceMQTTNode(NodeConfiguration config)
        {
            DeviceNodeMQTT details = new DeviceNodeMQTT();
            details.APIHost = config.APIHost;
            details.APIPortUEnc = config.APIHTTPPort ?? _DEFAULT_API_HTTP_PORT;
            details.APIPortEnc = config.APIHTTPSPort ?? _DEFAULT_API_HTTPS_PORT;
            details.MQHost = config.MQHost;
            details.MQPortUEnc = config.MQTTPort ?? _DEFAULT_MQTT_PORT;
            details.MQPortEnc = config.MQTTSPort ?? _DEFAULT_MQTTS_PORT;
            return details;
        }
    }
}