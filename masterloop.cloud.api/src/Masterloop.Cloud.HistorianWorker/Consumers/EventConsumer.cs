using System;
using System.Diagnostics;
using Masterloop.Cloud.BusinessLayer.Services.Cache;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Base;
using RabbitMQ.Client;

namespace Masterloop.Cloud.HistorianWorker.Consumers
{
    /// <summary>
    /// Responsible for receiving events and storing them to historian.
    /// </summary>
    public class EventConsumer : HistorianConsumer
    {
        private readonly IEventLogRepository _eventLogRepository;

        public EventConsumer(IModel channel, IEventLogRepository eventLogRepository, int batchSize, DeviceCache deviceCache)
            : base(channel, batchSize, deviceCache)
        {
            _eventLogRepository = eventLogRepository;
        }

        public override void HandleBasicDeliver(string consumerTag, ulong deliveryTag, bool redelivered, string exchange, string routingKey, IBasicProperties properties, ReadOnlyMemory<byte> body)
        {
            if (MessageRoutingKey.IsSystemNotification(routingKey))
            {
                base.HandleBasicDeliver(consumerTag, deliveryTag, redelivered, exchange, routingKey, properties, body);
            }
            else
            {
                Trace.TraceInformation($"EventConsumer - {routingKey}");
            }
        }
    }
}