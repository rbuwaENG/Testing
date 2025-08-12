using System;
using System.Collections.Generic;
using System.Diagnostics;
using Masterloop.Cloud.BusinessLayer.Services.RMQ;
using Masterloop.Core.Types.Base;
using Masterloop.Core.Types.Pulse;
using RabbitMQ.Client;

namespace Masterloop.Cloud.PulseWorker
{
    /// <summary>
    /// Listens for live signal from device (Observations and Command Responses), and creates Device Pulse if more than configurable interval time has elapsed.
    /// </summary>
    public class DeviceMessageConsumer : DefaultBasicConsumer
    {
        private IModel _subscriber;
        private RMQPublishService _publisher;
        private int _pulseTTLSeconds;
        private int _intervalSeconds;
        private Dictionary<string, DateTime> _lastPulse;

        public DeviceMessageConsumer(IModel subModel, RMQPublishService publisher, int pulseTTLSeconds, int intervalSeconds)
        {
            _subscriber = subModel;
            _publisher = publisher;
            _pulseTTLSeconds = pulseTTLSeconds;
            _intervalSeconds = intervalSeconds;
            _lastPulse = new Dictionary<string, DateTime>();
        }

        public override void HandleBasicDeliver(string consumerTag, ulong deliveryTag, bool redelivered, string exchange, string routingKey, IBasicProperties properties, ReadOnlyMemory<byte> body)
        {
            try
            {
                if (MessageRoutingKey.IsDeviceObservation(routingKey) ||
                    MessageRoutingKey.IsDeviceCommandResponse(routingKey))
                {
                    string MID = MessageRoutingKey.ParseMID(routingKey);
                    HandleDeviceMessage(MID);
                }
            }
            catch (Exception e)
            {
                Trace.TraceError($"{routingKey} Exception {e.Message}");
            }
        }

        private void HandleDeviceMessage(string MID)
        {
            if (_lastPulse.ContainsKey(MID))
            {
                TimeSpan ts = DateTime.UtcNow - _lastPulse[MID];
                if (ts.TotalSeconds > _intervalSeconds)
                {
                    Pulse pulse = new Pulse()
                    {
                        MID = MID,
                        PulseId = 0,
                        Category = PulseCategory.Heartbeat,
                        Timestamp = DateTime.UtcNow
                    };
                    _publisher.PublishPulse(pulse, _pulseTTLSeconds * 1000);
                }
            }
        }
    }
}