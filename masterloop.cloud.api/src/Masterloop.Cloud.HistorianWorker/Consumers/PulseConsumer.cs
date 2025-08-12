using System;
using System.Diagnostics;
using System.Linq;
using System.Text;
using Masterloop.Cloud.BusinessLayer.Managers;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.BusinessLayer.Services.Cache;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Base;
using Masterloop.Core.Types.Devices;
using Masterloop.Core.Types.Pulse;
using Newtonsoft.Json;
using RabbitMQ.Client;

namespace Masterloop.Cloud.HistorianWorker.Consumers
{
    /// <summary>
    /// Responsible for receiving pulses and storing them to historian and cache databases.
    /// </summary>
    public class PulseConsumer : HistorianConsumer
    {
        private readonly IPulseManager _pulseManager;

        public PulseConsumer(IModel channel, IPulseRepository pulseRepository, int batchSize, DeviceCache repoCache)
            : base(channel, batchSize, repoCache)
        {
            _pulseManager = new PulseManager(pulseRepository);
        }

        public override void HandleBasicDeliver(string consumerTag, ulong deliveryTag, bool redelivered, string exchange, string routingKey, IBasicProperties properties, ReadOnlyMemory<byte> body)
        {
            if (MessageRoutingKey.IsSystemNotification(routingKey))
            {
                base.HandleBasicDeliver(consumerTag, deliveryTag, redelivered, exchange, routingKey, properties, body);
            }
            else
            {
                string mid = MessageRoutingKey.ParseMID(routingKey);
                if (mid != null && mid.Length > 0)
                {
                    if (MessageRoutingKey.IsDevicePulse(routingKey) || MessageRoutingKey.IsApplicationPulse(routingKey))
                    {
                        StorePulse(deliveryTag, routingKey, mid, body);
                    }
                    else
                    {
                        _channel.BasicNack(deliveryTag, false, false);
                        Trace.TraceWarning($"Message is not a device pulse: {routingKey}");
                    }
                }
                else
                {
                    _channel.BasicNack(deliveryTag, false, false);
                    Trace.TraceWarning($"Message does not contain a valid MID: {routingKey}");
                }
            }
        }

        private void StorePulse(ulong deliveryTag, string routingKey, string mid, ReadOnlyMemory<byte> body)
        {
            int? pulseId;
            if (MessageRoutingKey.IsDevicePulse(routingKey))
            {
                pulseId = 0;
            }
            else if (MessageRoutingKey.IsApplicationPulse(routingKey))
            {
                pulseId = MessageRoutingKey.ParsePulseId(routingKey);
            }
            else
            {
                pulseId = null;
            }
            if (pulseId.HasValue)
            {
                DeviceTemplate dt = _deviceCache.GetTemplate(mid);
                if (dt != null)
                {
                    DevicePulse templatePulse = dt.Pulses.SingleOrDefault(p => p.Id == pulseId);
                    if (templatePulse != null)
                    {
                        if (body.Span != null && body.Span.Length > 0)
                        {
                            string json = Encoding.UTF8.GetString(body.Span);
                            if (json != null && json.Length > 0)
                            {
                                Pulse pulse = null;
                                try
                                {
                                    pulse = JsonConvert.DeserializeObject<Pulse>(json);
                                }
                                catch (Exception e)
                                {
                                    Trace.TraceError($"Pulse deserialization exception: {routingKey} : {json} - {e.Message}");
                                }
                                if (pulseId == 0)
                                {
                                    pulse = new Pulse()
                                    {
                                        MID = mid,
                                        Category = PulseCategory.Heartbeat,
                                        PulseId = pulseId.Value,
                                        Timestamp = DateTime.UtcNow
                                    };
                                }
                                if (pulse != null && pulse.MID == mid && pulse.PulseId == pulseId)
                                {
                                    DeviceTemplate template = _deviceCache.GetTemplate(pulse.MID);
                                    try
                                    {
                                        if (template != null)
                                        {
                                            _pulseManager.AppendPulse(pulse, template);
                                        }
                                        _channel.BasicAck(deliveryTag, false);
                                        return;
                                    }
                                    catch { }
                                }
                                else
                                {
                                    Trace.TraceWarning($"Failed to decode pulse: {routingKey}");
                                }
                            }
                            else
                            {
                                Trace.TraceWarning($"Unable to get pulse json from body: {routingKey}");
                            }
                        }
                        else
                        {
                            Trace.TraceWarning($"Message does not contain a valid body: {routingKey}");
                        }
                    }
                    else
                    {
                        Trace.TraceWarning($"Pulse not found in template: {routingKey}");
                    }
                }
                else
                {
                    Trace.TraceWarning($"Device not found: {routingKey}");
                }
            }
            else
            {
                Trace.TraceWarning($"Cannot parse pulse id: {routingKey}");
            }
            _channel.BasicNack(deliveryTag, false, false);
        }
    }
}