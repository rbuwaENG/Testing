using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using Masterloop.Cloud.Storage.Codecs;
using Masterloop.Cloud.BusinessLayer.Services.RMQ;
using Masterloop.Cloud.Core.RMQ;
using Masterloop.Core.Types.Base;
using Masterloop.Core.Types.Observations;
using RabbitMQ.Client;

namespace Masterloop.Cloud.ChopperWorker
{
    public class COSConsumer : DefaultBasicConsumer
    {
        private IModel _subscriber;
        private RMQPublishService _publisher;
        private int _batchSize;
        private int _expiration;
        private int _threadId;
        private List<ObservationMessage> _messages;

        public COSConsumer(IModel subModel, RMQPublishService publisher, int batchSize, int expiration, int threadId)
        {
            _subscriber = subModel;
            _publisher = publisher;
            _batchSize = batchSize;
            _expiration = expiration;
            _threadId = threadId;
            _messages = new List<ObservationMessage>();
        }

        public override void HandleBasicDeliver(string consumerTag, ulong deliveryTag, bool redelivered, string exchange, string routingKey, IBasicProperties properties, ReadOnlyMemory<byte> body)
        {
            try
            {
                if (MessageRoutingKey.IsDeviceObservationPackage(routingKey))
                {
                    string MID = MessageRoutingKey.ParseMID(routingKey);
                    string encoding = MessageRoutingKey.ParseObservationPackageType(routingKey);
                    if (!string.IsNullOrEmpty(MID) && !string.IsNullOrEmpty(encoding) && body.Span != null && body.Span.Length > 0)
                    {
                        HandleObservationPackage(MID, deliveryTag, encoding, body);  //TODO: Get rid of memory copying here.
                    }
                }
            }
            catch (Exception e)
            {
                Trace.TraceError($"{routingKey} Exception {e.Message} (thread {_threadId})");
                _subscriber.BasicNack(deliveryTag, false, false);
                if (body.Span != null)
                {
                    Trace.TraceError($"   Body-Length: {body.Length}");
                    Trace.TraceError($"   Body-Data: {BitConverter.ToString(body.Span.ToArray())}");
                }
                else
                {
                    Trace.TraceError($"   Body is <null>");
                }
            }
        }

        private void HandleObservationPackage(string MID, ulong deliveryTag, string encoding, ReadOnlyMemory<byte> body)
        {
            List<ObservationMessage> messages = new List<ObservationMessage>();

            byte[] cosData;
            Trace.TraceInformation($"{_threadId} : {MID} : Opening COS package with encoding {encoding} and length {body.Length}");
            if (encoding == "b64")
            {
                cosData = DecodeBase64(body);
            }
            else
            {
                cosData = body.Span.ToArray();
            }

            COSReader reader = new COSReader();
            reader.Open(cosData);

            Trace.TraceInformation($"{_threadId} : {MID} : Adding {reader.GetNumberOfObservations()} observations for publishing.");
            for (int i = 0; i < reader.GetNumberOfObservations(); i++)
            {
                IdentifiedObservation io = reader.GetObservation(i);
                DataType dataType = reader.GetDataType(i);

                ObservationMessage message = new ObservationMessage()
                {
                    MID = MID,
                    ObservationId = io.ObservationId,
                    ObservationType = dataType,
                    Observation = io.Observation
                };
                messages.Add(message);
            }

            if (messages != null && messages.Count > 0)
            {
                lock (_messages)
                {
                    _messages.AddRange(messages);
                    if (_messages.Count() >= _batchSize)
                    {
                        // Publish observation messages in one transaction to RMQ host, non-persistent.
                        Trace.TraceInformation($"{_threadId} : Publishing {_messages.Count()} messages.");
                        if (_publisher.IsConnected())
                        {
                            if (_publisher.PublishObservations(_messages.ToArray(), _expiration, false))
                            {
                                _subscriber.BasicAck(deliveryTag, true);
                            }
                            else
                            {
                                _subscriber.BasicNack(deliveryTag, true, true);
                            }
                            _messages.Clear();
                        }
                    }
                }
            }
            else
            {
                _subscriber.BasicNack(deliveryTag, false, false);
            }
        }

        private byte[] DecodeBase64(ReadOnlyMemory<byte> b64Data)
        {
            try
            {
                string encodedString = Encoding.UTF8.GetString(b64Data.ToArray());
                return Convert.FromBase64String(encodedString);
            }
            catch (Exception)
            {
                return null;
            }
        }
    }
}