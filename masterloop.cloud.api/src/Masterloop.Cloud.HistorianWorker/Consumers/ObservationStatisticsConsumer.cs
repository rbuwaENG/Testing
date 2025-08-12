using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using Masterloop.Cloud.BusinessLayer.Services.Cache;
using Masterloop.Cloud.BusinessLayer.Services.Observations;
using Masterloop.Cloud.Core.Observation;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Base;
using Masterloop.Core.Types.Devices;
using Masterloop.Core.Types.Observations;
using Newtonsoft.Json;
using RabbitMQ.Client;

namespace Masterloop.Cloud.HistorianWorker.Consumers
{
    /// <summary>
    /// Responsible for receiving observations and storing them to observation statistics historian.
    /// For observations with DataType Double. Current values are still the Double value.
    /// If HistorianType is set to TimeRangeStatistics, will store one DescriptiveStatistics values every HistorianStep seconds.
    /// If HistorianType is set to SampleCountStatistics, will store one DescriptiveStatistics value every HistorianStep samples.
    /// Limitations:
    /// - Restart will cause loss of in-memory statistics records.
    /// - DescriptiveStatistics objects are only provided as historian records, and not as current values.
    /// </summary>
    public class ObservationStatisticsConsumer : HistorianConsumer
    {
        private readonly IObservationRepository _observationRepository;

        /// <summary>
        /// In-Memory statistics structures.
        /// Key: <MID>_<ObsId>_<Type>
        /// Value: RunningStatistics object.
        /// </summary>
        private Dictionary<string, RunningStatistics> _values;

        public ObservationStatisticsConsumer(IModel channel, IObservationRepository observationRepository, int batchSize, DeviceCache deviceCache)
            : base(channel, batchSize, deviceCache)
        {
            _observationRepository = observationRepository;
            _values = new Dictionary<string, RunningStatistics>();
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
                    if (obs != null && obs.DataType == DataType.Double && (obs.Historian == HistorianType.SampleCountStatistics || obs.Historian == HistorianType.TimeRangeStatistics))
                    {
                        if (body.Span != null && body.Span.Length > 0)
                        {
                            string json = Encoding.UTF8.GetString(body.Span);
                            if (json != null && json.Length > 0)
                            {
                                DoubleObservation o = DecodeObservation(mid, obsId, json);
                                if (o != null)
                                {
                                    StoredObservation so = PrepareStoredObservation(mid, obsId, obs.DataType, o);
                                    if (so != null)
                                    {
                                        // Create observation key: MID+obsId+type
                                        string cacheKey = GetKeyString(mid, obsId);

                                        RunningStatistics stats = null;

                                        // If key found in memory or if R is found in ObservationCurrentRepository:
                                        if (_values.ContainsKey(cacheKey))
                                        {
                                            stats = _values[cacheKey];
                                        }
                                        else
                                        {
                                            stats = CreateNewStatisticsObject(obs.Historian, obs.HistorianStep, o);
                                            _values[cacheKey] = stats;
                                        }

                                        if (o.Timestamp < stats.From)
                                        {
                                            Trace.TraceWarning($"Out-of-sequence observation detected: {routingKey}");
                                            _channel.BasicNack(deliveryTag, false, false);
                                            return;
                                        }

                                        if (obs.Historian == HistorianType.TimeRangeStatistics)
                                        {
                                            if (o.Timestamp <= stats.To)
                                            {
                                                // Append obs to R
                                                stats.Push(o.Value);
                                            }
                                            else if (o.Timestamp > stats.To)
                                            {
                                                // Save R to ObservationHistoryRepository.
                                                StoreStatisticsObservation(mid, obs, stats);

                                                // Create new R in-memory (replaces old, if exists).
                                                stats = CreateNewStatisticsObject(obs.Historian, obs.HistorianStep, o);
                                                _values[cacheKey] = stats;

                                                // Append obs to R.
                                                stats.Push(o.Value);
                                            }
                                        }
                                        else if (obs.Historian == HistorianType.SampleCountStatistics)
                                        {
                                            if (stats.Count < obs.HistorianStep)
                                            {
                                                // Append obs to R
                                                stats.Push(o.Value);
                                            }
                                            else if (stats.Count >= obs.HistorianStep)
                                            {
                                                // Save R to ObservationHistoryRepository.
                                                StoreStatisticsObservation(mid, obs, stats);

                                                // Create new R in-memory (replaces old, if exists).
                                                stats = CreateNewStatisticsObject(obs.Historian, obs.HistorianStep, o);
                                                _values[cacheKey] = stats;

                                                // Append obs to R.
                                                stats.Push(o.Value);
                                            }
                                        }
                                        _channel.BasicAck(deliveryTag, false);
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

        private string GetKeyString(string mid, int obsId)
        {
            return $"{mid}_{obsId}";
        }

        private RunningStatistics CreateNewStatisticsObject(HistorianType historianType, int historianStep, DoubleObservation o)
        {
            if (historianType == HistorianType.TimeRangeStatistics)
            {
                DateTime f = GetTimeRangeStatisticsStart(o.Timestamp, historianStep);
                return new RunningStatistics()
                {
                    From = f,
                    To = f.AddSeconds(historianStep)
                };
            }
            else if (historianType == HistorianType.SampleCountStatistics)
            {
                DateTime f = o.Timestamp;
                return new RunningStatistics()
                {
                    From = f,
                    To = f.AddSeconds(1)  //HACK: Need some minimum timeframe
                };
            }
            else
            {
                throw new ArgumentException($"ICreateNewStatisticsObject does not support this combination: {historianType} with {historianStep}.");
            }
        }

        private bool StoreStatisticsObservation(string mid, DeviceObservation obs, RunningStatistics stats)
        {
            StatisticsObservation statsObs = new StatisticsObservation()
            {
                Timestamp = stats.From.Value,
                Value = stats as DescriptiveStatistics
            };
            StoredObservation storedObs = new StoredObservation()
            {
                MID = mid,
                Observation = new ExpandedObservationValue(obs.Id, obs.DataType, statsObs)
            };
            return _observationRepository.CreateHistory(new StoredObservation[] { storedObs }, false);
        }

        private DateTime GetTimeRangeStatisticsStart(DateTime t, int historianStep)
        {
            if (t.Kind != DateTimeKind.Utc) throw new ArgumentException($"Invalid time format: {t.Kind}");

            if (historianStep == 60)  // Snap to UTC 1 minute start
            {
                return new DateTime(t.Year, t.Month, t.Day, t.Hour, t.Minute, 0, DateTimeKind.Utc);
            }
            else if (historianStep == 300)  // Snap to UTC 5 minute start
            {
                int n = 5 * (int)(Math.Floor((double)(t.Minute) / 5.0));
                return new DateTime(t.Year, t.Month, t.Day, t.Hour, n, 0, DateTimeKind.Utc);
            }
            else if (historianStep == 600)  // Snap to UTC 10 minute start
            {
                int n = 10 * (int)(Math.Floor((double)(t.Minute) / 10.0));
                return new DateTime(t.Year, t.Month, t.Day, t.Hour, n, 0, DateTimeKind.Utc);
            }
            else if (historianStep == 900)  // Snap to UTC 15 minute start
            {
                int n = 15 * (int)(Math.Floor((double)(t.Minute) / 15.0));
                return new DateTime(t.Year, t.Month, t.Day, t.Hour, n, 0, DateTimeKind.Utc);
            }
            else if (historianStep == 1800)  // Snap to UTC 30 minute start
            {
                int n = 30 * (int)(Math.Floor((double)(t.Minute) / 30.0));
                return new DateTime(t.Year, t.Month, t.Day, t.Hour, n, 0, DateTimeKind.Utc);
            }
            else if (historianStep == 0 || historianStep == 3600)  // Snap to UTC hour start (default if historian step is 0, i.e. not specified)
            {
                return new DateTime(t.Year, t.Month, t.Day, t.Hour, 0, 0, DateTimeKind.Utc);
            }
            else if (historianStep == 86400)  // Snap to UTC day start
            {
                return new DateTime(t.Year, t.Month, t.Day, 0, 0, 0, DateTimeKind.Utc);
            }
            else
            {
                return t;
            }
        }

        private DoubleObservation DecodeObservation(string mid, int obsId, string json)
        {
            DoubleObservation o = JsonConvert.DeserializeObject<DoubleObservation>(json);
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