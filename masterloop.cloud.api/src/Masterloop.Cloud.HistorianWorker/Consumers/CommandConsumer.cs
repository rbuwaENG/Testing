using System;
using System.Diagnostics;
using System.Linq;
using System.Text;
using Masterloop.Cloud.BusinessLayer.Services.Cache;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Base;
using Masterloop.Core.Types.Commands;
using Masterloop.Core.Types.Devices;
using Newtonsoft.Json;
using RabbitMQ.Client;

namespace Masterloop.Cloud.HistorianWorker.Consumers
{
    /// <summary>
    /// Responsible for receiving commands and storing them to historian.
    /// Note: This implementation does not utilize batch insert.
    /// </summary>
    public class CommandConsumer : HistorianConsumer
    {
        private readonly ICommandRepository _commandRepository;

        public CommandConsumer(IModel channel, ICommandRepository commandRepository, int batchSize, DeviceCache deviceCache)
            : base(channel, batchSize, deviceCache)
        {
            _commandRepository = commandRepository;
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
                    int cmdId = MessageRoutingKey.ParseCommandId(routingKey);
                    if (cmdId != 0)
                    {
                        DeviceTemplate dt = _deviceCache.GetTemplate(mid);
                        if (dt != null)
                        {
                            DeviceCommand cmd = dt.Commands.SingleOrDefault(c => c.Id == cmdId);
                            if (cmd != null)
                            {
                                if (body.Span != null && body.Span.Length > 0)
                                {
                                    string json = Encoding.UTF8.GetString(body.Span);
                                    if (json != null && json.Length > 0)
                                    {
                                        if (MessageRoutingKey.IsDeviceCommand(routingKey))
                                        {
                                            string originApplication = null, originAccount = null, originAddress = null, originReference = null;
                                            if (properties != null && properties.Headers != null)
                                            {
                                                originApplication = properties.Headers.ContainsKey("OriginApplication") ? Encoding.UTF8.GetString((byte[])properties.Headers["OriginApplication"]) : null;
                                                originAccount = properties.Headers.ContainsKey("OriginAccount") ? Encoding.UTF8.GetString((byte[])properties.Headers["OriginAccount"]) : null;
                                                originAddress = properties.Headers.ContainsKey("OriginAddress") ? Encoding.UTF8.GetString((byte[])properties.Headers["OriginAddress"]) : null;
                                                originReference = properties.Headers.ContainsKey("OriginReference") ? Encoding.UTF8.GetString((byte[])properties.Headers["OriginReference"]) : null;
                                            }
                                            StoreCommand(deliveryTag, mid, cmdId, json, originApplication, originAccount, originAddress, originReference);
                                        }
                                        else if (MessageRoutingKey.IsDeviceCommandResponse(routingKey))
                                        {
                                            StoreCommandResponse(deliveryTag, mid, cmdId, json, redelivered);
                                        }
                                        else
                                        {
                                            Trace.TraceWarning($"Message is not a command or command response: {routingKey}");
                                            _channel.BasicNack(deliveryTag, false, false);
                                        }
                                    }
                                    else
                                    {
                                        Trace.TraceWarning($"Unable to get command json from body: {routingKey}");
                                        _channel.BasicNack(deliveryTag, false, false);
                                    }
                                }
                                else
                                {
                                    Trace.TraceWarning($"Message does not contain a valid body: {routingKey}");
                                    _channel.BasicNack(deliveryTag, false, false);
                                }
                            }
                            else
                            {
                                Trace.TraceWarning($"Command not found in template: {routingKey}");
                                _channel.BasicNack(deliveryTag, false, false);
                            }
                        }
                        else
                        {
                            Trace.TraceWarning($"Device not found: {routingKey}");
                            _channel.BasicNack(deliveryTag, false, false);
                        }
                    }
                    else
                    {
                        Trace.TraceWarning($"Cannot parse command id: {routingKey}");
                        _channel.BasicNack(deliveryTag, false, false);
                    }
                }
                else
                {
                    Trace.TraceWarning($"Message does not contain a valid MID: {routingKey}");
                    _channel.BasicNack(deliveryTag, false, false);
                }
            }
        }

        private void StoreCommand(ulong deliveryTag, string mid, int cmdId, string json, string originApplication, string originAccount, string originAddress, string originReference)
        {
            CommandHistory c = null;
            try
            {
                c = JsonConvert.DeserializeObject<CommandHistory>(json);
            }
            catch (Exception) { }

            if (c == null || c.Id != cmdId)
            {
                // Mismatch, abort storing and nack.
                _channel.BasicNack(deliveryTag, false, false);
                return;
            }

            // Append message header information.
            c.OriginApplication = originApplication;
            c.OriginAccount = originAccount;
            c.OriginAddress = originAddress;
            c.OriginReference = originReference;

            // Store in repo.
            lock (_commandRepository)
            {
                try
                {
                    if (_commandRepository.Create(mid, c))
                    {
                        _channel.BasicAck(deliveryTag, false);
                    }
                    else
                    {
                        _channel.BasicNack(deliveryTag, false, false);
                    }
                }
                catch
                {
                    _channel.BasicNack(deliveryTag, false, false);  //TODO: Consider re-queueing if total failure in storage.
                }
            }
        }

        private void StoreCommandResponse(ulong deliveryTag, string mid, int cmdId, string json, bool redelivered)
        {
            CommandResponse cr = null;

            try
            {
                cr = JsonConvert.DeserializeObject<CommandResponse>(json);
            }
            catch (Exception) { }

            if (cr == null || cr.Id != cmdId)
            {
                // Mismatch, abort storing and nack.
                _channel.BasicNack(deliveryTag, false, false);
                return;
            }

            lock (_commandRepository)
            {
                try
                {
                    if (_commandRepository.Update(mid, cr))
                    {
                        _channel.BasicAck(deliveryTag, false);
                    }
                    else
                    {
                        if (redelivered)  // Only grant one redelivered sequence, then remove.
                        {
                            _channel.BasicNack(deliveryTag, false, false);
                        }
                        else
                        {
                            _channel.BasicNack(deliveryTag, false, true);
                        }
                    }
                }
                catch
                {
                    _channel.BasicNack(deliveryTag, false, false);  //TODO: Consider re-queueing if total failure in storage.
                }
            }
        }
    }
}