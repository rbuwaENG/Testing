using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using Masterloop.Cloud.BusinessLayer.Services.Cache;
using Masterloop.Cloud.Core.Observation;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Base;
using Masterloop.Core.Types.Devices;
using Masterloop.Core.Types.Observations;
using Newtonsoft.Json;
using RabbitMQ.Client;

namespace Masterloop.Cloud.TwinWorker.Consumers
{
    /// <summary>
    /// Responsible for receiving observations and storing them to observation current cache.
    /// </summary>
    public class ObservationConsumer : TwinConsumer
    {
        private readonly IObservationRepository _observationRepository;
        private List<StoredObservation> _observations;

        public ObservationConsumer(IModel channel, IObservationRepository observationRepository, int batchSize, DeviceCache deviceCache)
            : base(channel, batchSize, deviceCache)
        {
            _observationRepository = observationRepository;
            _observations = new List<StoredObservation>();
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
                    if (MessageRoutingKey.IsDeviceObservation(routingKey))
                    {
                        StoreObservation(deliveryTag, routingKey, mid, body);
                    }
                    else
                    {
                        _channel.BasicNack(deliveryTag, false, false);
                        Trace.TraceWarning($"Message is not a device observation: {routingKey}");
                    }
                }
                else
                {
                    _channel.BasicNack(deliveryTag, false, false);
                    Trace.TraceWarning($"Message does not contain a valid MID: {routingKey}");
                }
            }
        }

        public override void Flush()
        {
            lock (_observations)
            {

                if (_observations.Count() > 0)
                {
                    if (_observationRepository.CreateCurrent(_observations.ToArray()) > 0)
                    {
                        _channel.BasicAck(_lastDeliveryTag, true);
                    }
                    else  // Failed to insert, re-queue
                    {
                        Trace.TraceWarning($"Failed to insert {_observations.Count()} observations.");
                        _channel.BasicNack(_lastDeliveryTag, true, true);
                    }
                    _observations.Clear();
                    _batchStarted = DateTime.UtcNow;
                }
            }
        }

        private void StoreObservation(ulong deliveryTag, string routingKey, string mid, ReadOnlyMemory<byte> body)
        {
            int obsId = MessageRoutingKey.ParseObservationId(routingKey);
            if (obsId != 0)
            {
                DeviceTemplate dt = _deviceCache.GetTemplate(mid);
                if (dt != null)
                {
                    DeviceObservation obs = dt.Observations.SingleOrDefault(o => o.Id == obsId);
                    if (obs != null)
                    {
                        if (body.Span != null && body.Span.Length > 0)
                        {
                            string json = Encoding.UTF8.GetString(body.Span);
                            if (json != null && json.Length > 0)
                            {
                                Observation o = DecodeObservation(mid, obsId, obs.DataType, json);
                                if (o != null)
                                {
                                    StoredObservation so = PrepareStoredObservation(mid, obsId, obs.DataType, o);
                                    if (so != null)
                                    {
                                        lock (_observations)
                                        {
                                            _observations.Add(so);
                                            _lastDeliveryTag = deliveryTag;
                                            TimeSpan age = DateTime.UtcNow - _batchStarted;
                                            if (_observations.Count() >= _batchSize)
                                            {
                                                if (_observationRepository.CreateCurrent(_observations.ToArray()) > 0)
                                                {
                                                    _channel.BasicAck(deliveryTag, true);
                                                }
                                                else  // Failed to insert, re-queue
                                                {
                                                    Trace.TraceWarning($"Failed to insert {_observations.Count()} observations.");
                                                    _channel.BasicNack(deliveryTag, true, true);
                                                }
                                                _observations.Clear();
                                                _batchStarted = DateTime.UtcNow;
                                            }
                                        }
                                        return;
                                    }
                                    else
                                    {
                                        // Could not prepare observation for storage, anomalies are logged inside sub method.
                                    }
                                }
                                else
                                {
                                    Trace.TraceWarning($"Failed to decode observation: {routingKey}");
                                }
                            }
                            else
                            {
                                Trace.TraceWarning($"Unable to get observation json from body: {routingKey}");
                            }
                        }
                        else
                        {
                            Trace.TraceWarning($"Message does not contain a valid body: {routingKey}");
                        }
                    }
                    else
                    {
                        Trace.TraceWarning($"Observation not found in template: {routingKey}");
                    }
                }
                else
                {
                    Trace.TraceWarning($"Device not found: {routingKey}");
                }
            }
            else
            {
                Trace.TraceWarning($"Cannot parse observation id: {routingKey}");
            }
            _channel.BasicNack(deliveryTag, false, false);
        }

        private Observation DecodeObservation(string mid, int obsId, DataType dataType, string json)
        {
            Observation o = null;
            switch (dataType)
            {
                case DataType.Boolean: o = JsonConvert.DeserializeObject<BooleanObservation>(json); break;
                case DataType.Double: o = JsonConvert.DeserializeObject<DoubleObservation>(json); break;
                case DataType.Integer: o = JsonConvert.DeserializeObject<IntegerObservation>(json); break;
                case DataType.Position: o = JsonConvert.DeserializeObject<PositionObservation>(json); break;
                case DataType.String: o = JsonConvert.DeserializeObject<StringObservation>(json); break;
                case DataType.Statistics: o = JsonConvert.DeserializeObject<StatisticsObservation>(json); break;
            }

            if (o != null)
            {
                return o;
            }
            else
            {
                Trace.TraceWarning("Unable to deserialize observation json");
                return null;
            }
        }

        private StoredObservation PrepareStoredObservation(string mid, int obsId, DataType dataType, Observation o)
        {
            TimeSpan ts = DateTime.UtcNow - o.Timestamp;
            if (ts.TotalHours < -1)
            {
                Trace.TraceWarning($"Observation more than 1 hour into the future and will not be stored: {o.Timestamp.ToString("o")}");
                return null;
            }

            return new StoredObservation()
            {
                MID = mid,
                Observation = new ExpandedObservationValue(obsId, dataType, o)
            };
        }
    }
}