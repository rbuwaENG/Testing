using System;
using System.Diagnostics;
using System.Threading;
using Masterloop.Cloud.BusinessLayer.Services.RMQ;
using Masterloop.Cloud.Core.RMQ;
using RabbitMQ.Client;

namespace Masterloop.Cloud.PulseWorker
{
    public class DeviceMessagePulseGenerator : IPulseGenerator
    {
        public bool IsRunning { get; set; }

        private DefaultBasicConsumer _consumer;
        private IConnection _brokerConnection;
        private IModel _brokerChannel;
        private ConnectionFactory _rmqFactory;
        private RMQPublishService _rmqPublisher;
        private string _rmqQueueName;
        private ushort _rmqPrefetchCount;
        private int _pulseTTLSeconds;
        private int _intervalSeconds;

        public DeviceMessagePulseGenerator(
            string rmqConnectionString,
            string queueName,
            ushort prefetchCount,
            ushort heartbeatSeconds,
            int pulseTTLSeconds,
            int intervalSeconds)
        {
            MessagingConnection rmqConnection = new MessagingConnection(rmqConnectionString);
            _rmqFactory = new ConnectionFactory
            {
                HostName = rmqConnection.HostName,
                UserName = rmqConnection.Username,
                Password = rmqConnection.Password,
                RequestedHeartbeat = new TimeSpan(0, 0, heartbeatSeconds)
            };
            if (rmqConnection.Encrypted)
            {
                _rmqFactory.Ssl = new SslOption() { Enabled = true, ServerName = rmqConnection.HostName, Version = System.Security.Authentication.SslProtocols.Tls13 };
            }
            _rmqQueueName = queueName;
            _rmqPrefetchCount = prefetchCount;

            _rmqPublisher = new RMQPublishService(rmqConnectionString, null);
            _pulseTTLSeconds = pulseTTLSeconds;
            _intervalSeconds = intervalSeconds;
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        ~DeviceMessagePulseGenerator()
        {
            // Finalizer calls Dispose(false)
            Dispose(false);
        }

        protected virtual void Dispose(bool disposing)
        {
            if (disposing)
            {
                // free managed resources
                DisposeAllConnectionObjects(true);
            }
        }

        public bool Init()
        {
            return true;
        }

        public bool Run()
        {
            while (this.IsRunning)
            {
                // Ensure is connected
                if (_consumer != null && _consumer.IsRunning && _rmqPublisher != null && _rmqPublisher.IsConnected())
                {
                    // Connected OK
                }
                else
                {
                    DisposeAllConnectionObjects(true);
                    try
                    {
                        // Connect subscriber to AMQP host
                        _brokerConnection = _rmqFactory.CreateConnection();
                        _brokerChannel = _brokerConnection.CreateModel();
                        _brokerChannel.BasicQos(0, (ushort)_rmqPrefetchCount, false);
                        _consumer = new DeviceMessageConsumer(_brokerChannel, _rmqPublisher,_pulseTTLSeconds, _intervalSeconds);

                        // Connect publisher to AMQP host
                        if (!_rmqPublisher.Connect())
                        {
                            throw new Exception("Unable to connect publisher.");
                        }

                        _brokerChannel.BasicConsume(_rmqQueueName, true, _consumer);  // Use auto-ack because missing a few msgs is not mission critical.
                        return true;
                    }
                    catch (Exception e)
                    {
                        Trace.TraceError($"Run Exception: {e.Message}");
                    }
                }
                Thread.Sleep(10 * 1000);
            }
            return true;
        }

        private void DisposeAllConnectionObjects(bool disposePublishers)
        {
            if (_consumer != null)
            {
                if (_consumer.ConsumerTags != null)
                {
                    foreach (var consumerTag in _consumer.ConsumerTags)
                    {
                        if (!string.IsNullOrEmpty(consumerTag))
                        {
                            _brokerChannel.BasicCancel(consumerTag);
                        }
                    }
                }
                _consumer = null;
            }

            if (_brokerChannel != null)
            {
                _brokerChannel.Dispose();
                _brokerChannel = null;
            }

            if (_brokerConnection != null)
            {
                try
                {
                    _brokerConnection.Dispose();
                }
                catch { }
                _brokerConnection = null;
            }

            if (disposePublishers && _rmqPublisher != null && _rmqPublisher.IsConnected())
            {
                _rmqPublisher.Disconnect();
                _rmqPublisher.Dispose();
            }
        }
    }
}