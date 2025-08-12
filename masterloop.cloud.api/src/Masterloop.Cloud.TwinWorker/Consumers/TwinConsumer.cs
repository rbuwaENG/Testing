using System;
using System.Text;
using Masterloop.Cloud.BusinessLayer.Services.Cache;
using Masterloop.Cloud.Core.SystemNotification;
using Masterloop.Core.Types.Base;
using Newtonsoft.Json;
using RabbitMQ.Client;

namespace Masterloop.Cloud.TwinWorker.Consumers
{
    public class TwinConsumer : DefaultBasicConsumer
    {
        protected readonly IModel _channel;
        protected readonly int _batchSize;
        protected DateTime _batchStarted;
        protected DeviceCache _deviceCache;
        protected ulong _lastDeliveryTag;

        public TwinConsumer(IModel channel, int batchSize, DeviceCache deviceCache)
        {
            _channel = channel;
            _batchSize = batchSize;
            _batchStarted = DateTime.UtcNow;
            _deviceCache = deviceCache;
        }

        public override void HandleBasicDeliver(string consumerTag, ulong deliveryTag, bool redelivered, string exchange, string routingKey, IBasicProperties properties, ReadOnlyMemory<byte> body)
        {
            if (MessageRoutingKey.IsSystemNotification(routingKey))
            {
                SystemNotificationCategory category = (SystemNotificationCategory)MessageRoutingKey.ParseSystemNotification(routingKey);
                HandleSystemNotification(category, body);
                _channel.BasicAck(deliveryTag, false);
            }
        }

        public virtual void Flush()
        {
        }

        protected void HandleSystemNotification(SystemNotificationCategory category, ReadOnlyMemory<byte> body)
        {
            if (body.Span != null && body.Span.Length > 0)
            {
                string json = Encoding.UTF8.GetString(body.Span);
                if (json != null && json.Length > 0)
                {
                    if (category == SystemNotificationCategory.TemplateChanged)
                    {
                        SystemNotificationTemplateChanged sn = JsonConvert.DeserializeObject<SystemNotificationTemplateChanged>(json);
                        _deviceCache.RemoveTemplate(sn.TID);
                    }
                    else if (category == SystemNotificationCategory.DeviceTemplateChanged)
                    {
                        SystemNotificationDeviceTemplateChanged sn = JsonConvert.DeserializeObject<SystemNotificationDeviceTemplateChanged>(json);
                        _deviceCache.RemoveDevice(sn.MID);
                    }
                }
            }
        }
    }
}
