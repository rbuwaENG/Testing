using System;
using System.Diagnostics;
using System.Threading;
using Masterloop.Cloud.BusinessLayer.Services.RMQ;
using Masterloop.Cloud.Core.RMQ;
using RabbitMQ.Client;

namespace Masterloop.Cloud.ChopperWorker
{
    public class MessageChopper : IDisposable
    {
        private string _rabbitMqQueueName;
        private ushort _rabbitMqPrefetchCount;

        private DefaultBasicConsumer _consumer;
        private IConnection _brokerConnection;
        private IModel _brokerChannel;
        private ConnectionFactory _rmqFactory;
        private RMQPublishService _rmqPublisher;
        private int _batchSize;
        private int _messageExpiration;
        private int _threadId;

        public MessageChopper(
            string messagingConnectionString,
            string queueName,
            ushort heartbeat,
            ushort prefetchCount,
            int messageExpiration,
            int publishConfirmTimeout,
            int batchSize,
            int threadId)
        {
            MessagingConnection rmqConnection = new MessagingConnection(messagingConnectionString);
            _rmqFactory = new ConnectionFactory
            {
                HostName = rmqConnection.HostName,
                UserName = rmqConnection.Username,
                Password = rmqConnection.Password,
                RequestedHeartbeat = new TimeSpan(0, 0, heartbeat)
            };
            if (rmqConnection.Encrypted)
            {
                _rmqFactory.Ssl = new SslOption() { Enabled = true, ServerName = rmqConnection.HostName, Version = System.Security.Authentication.SslProtocols.Tls12 };
            }
            _rabbitMqQueueName = queueName;
            _rabbitMqPrefetchCount = prefetchCount;
            _batchSize = batchSize;

            TimeSpan? pubConfirmTimeout = publishConfirmTimeout > 0 ? new TimeSpan(0, 0, publishConfirmTimeout) : (TimeSpan?)null;
            _rmqPublisher = new RMQPublishService(messagingConnectionString, pubConfirmTimeout);
            _messageExpiration = messageExpiration;
            _threadId = threadId;
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        ~MessageChopper()
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

        public void Run()
        {
            // Ensure is connected
            if (_consumer != null && _consumer.IsRunning && _rmqPublisher != null && _rmqPublisher.IsConnected())
            {
                return;
            }
            else
            {
                DisposeAllConnectionObjects(true);
                try
                {
                    // Connect subscriber to AMQP host
                    _brokerConnection = _rmqFactory.CreateConnection();
                    _brokerChannel = _brokerConnection.CreateModel();
                    _brokerChannel.BasicQos(0, (ushort)_rabbitMqPrefetchCount, false);
                    _consumer = new COSConsumer(_brokerChannel, _rmqPublisher, _batchSize, _messageExpiration, _threadId);

                    // Connect publisher to AMQP host
                    if (!_rmqPublisher.Connect())
                    {
                        throw new Exception("Unable to connect publisher.");
                    }

                    _brokerChannel.BasicConsume(_rabbitMqQueueName, false, _consumer);
                }
                catch (Exception e)
                {
                    Trace.TraceError($"Run Exception: {e.Message}");
                    Thread.Sleep(1 * 1000);
                }
            }
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