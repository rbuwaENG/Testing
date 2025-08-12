using RabbitMQ.Client;
using System;
using Masterloop.Core.Types.Observations;
using Masterloop.Core.Types.Commands;
using Masterloop.Core.Types.Base;
using Newtonsoft.Json;
using System.Text;
using Masterloop.Cloud.Core.RMQ;
using Masterloop.Cloud.Core.SystemNotification;
using Masterloop.Core.Types.Pulse;
using System.Collections.Generic;

namespace Masterloop.Cloud.BusinessLayer.Services.RMQ
{
    public class RMQPublishService : IRMQPublishService
    {
        private string _messagingConnectionString;
        private ConnectionFactory _connectionFactory;
        private IConnection _connection;
        private IModel _model;
        private readonly TimeSpan? _publishConfirmTimeout;
        private object _semaphore = new object();

        #region LifeCycle
        public RMQPublishService(string messagingConnectionString, TimeSpan? publishConfirmTimeout)
        {
            _messagingConnectionString = messagingConnectionString;
            _publishConfirmTimeout = publishConfirmTimeout;
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        ~RMQPublishService()
        {
            // Finalizer calls Dispose(false)
            Dispose(false);
        }

        protected virtual void Dispose(bool disposing)
        {
            if (disposing)
            {
                // free managed resources
                Disconnect();
            }
        }
        #endregion

        public bool Connect()
        {
            MessagingConnection connectionDetails = new MessagingConnection(_messagingConnectionString);
            _connectionFactory = new ConnectionFactory()
            {
                HostName = connectionDetails.HostName,
                UserName = connectionDetails.Username,
                Password = connectionDetails.Password,
            };
            if (connectionDetails.Encrypted)
            {
                _connectionFactory.Ssl = new SslOption() { Enabled = true, ServerName = connectionDetails.HostName };
            }

            try
            {
                _connection = _connectionFactory.CreateConnection();
                if (_connection != null && _connection.IsOpen)
                {
                    lock (_semaphore)
                    {
                        _model = _connection.CreateModel();
                        if (_model != null)
                        {
                            if (_publishConfirmTimeout != null)
                            {
                                _model.ConfirmSelect();
                            }
                        }
                        return _model != null && _model.IsOpen;
                    }
                }
            }
            catch (Exception)
            { }
            return false;  // Failed to create connection
        }

        public void Disconnect()
        {
            lock (_semaphore)
            {
                if (_model != null)
                {
                    _model.Close(200, "Goodbye");
                    _model.Dispose();
                    _model = null;
                }

                if (_connection != null)
                {
                    _connection.Close();
                    _connection.Dispose();
                    _connection = null;
                }

                if (_connectionFactory != null)
                {
                    _connectionFactory = null;
                }
            }
        }

        public bool IsConnected()
        {
            lock (_semaphore)
            {
                if (_connectionFactory == null) return false;
                if (_connection == null) return false;
                if (_model == null) return false;
                return _model.IsOpen;
            }
        }

        private bool EnsureConnected()
        {
            if (IsConnected())
            {
                return true;
            }
            else
            {
                return Connect();
            }
        }

        public bool PublishObservations(ObservationMessage[] observations, int expiration = 0, bool persistent = false)
        {
            if (EnsureConnected())
            {
                lock (_semaphore)
                {
                    foreach (ObservationMessage observation in observations)
                    {
                        byte[] body = Serialize<Observation>(observation.Observation);
                        string routingKey = MessageRoutingKey.GenerateDeviceObservationRoutingKey(observation.MID, observation.ObservationId);
                        IBasicProperties properties = GetMessageProperties(persistent, expiration);
                        string exchangeName = RMQNameProvider.CreateDeviceExchangeName(observation.MID);
                        _model.BasicPublish(exchangeName, routingKey, properties, body);
                    }
                    if (_publishConfirmTimeout == null) return true;
                    else return _model.WaitForConfirms(_publishConfirmTimeout.Value);
                }
            }
            else
            {
                return false;
            }
        }

        public bool PublishObservations(ObservationMessage[] observations, string exchangeName, int expiration = 0, bool persistent = false)
        {
            if (EnsureConnected())
            {
                lock (_semaphore)
                {
                    foreach (ObservationMessage observation in observations)
                    {
                        byte[] body = Serialize<Observation>(observation.Observation);
                        string routingKey = MessageRoutingKey.GenerateDeviceObservationRoutingKey(observation.MID, observation.ObservationId);
                        IBasicProperties properties = GetMessageProperties(persistent, expiration);
                        _model.BasicPublish(exchangeName, routingKey, properties, body);
                    }
                    if (_publishConfirmTimeout == null) return true;
                    else return _model.WaitForConfirms(_publishConfirmTimeout.Value);
                }
            }
            else
            {
                return false;
            }
        }

        public bool PublishCommand(CommandMessage command, bool persistent = false)
        {
            if (EnsureConnected())
            {
                lock (_semaphore)
                {
                    string exchangeName = RMQNameProvider.CreateDeviceExchangeName(command.MID);
                    string routingKey = MessageRoutingKey.GenerateDeviceCommandRoutingKey(command.MID, command.Command.Id, command.Command.Timestamp);
                    byte[] body = Serialize<Command>(command.Command);
                    IBasicProperties properties = GetMessageProperties(persistent, 0);
                    properties.Headers = new Dictionary<string, object>();
                    if (!string.IsNullOrEmpty(command.OriginApplication)) properties.Headers.Add("OriginApplication", command.OriginApplication);
                    if (!string.IsNullOrEmpty(command.OriginAccount)) properties.Headers.Add("OriginAccount", command.OriginAccount);
                    if (!string.IsNullOrEmpty(command.OriginAddress)) properties.Headers.Add("OriginAddress", command.OriginAddress);
                    if (!string.IsNullOrEmpty(command.OriginReference)) properties.Headers.Add("OriginReference", command.OriginReference);
                    if (command.Command.ExpiresAt.HasValue)
                    {
                        TimeSpan ts = command.Command.ExpiresAt.Value - DateTime.UtcNow;
                        if (ts.TotalMilliseconds > 0)
                        {
                            properties.Expiration = ts.TotalMilliseconds.ToString("F0");
                        }
                    }
                    _model.BasicPublish(exchangeName, routingKey, properties, body);
                    if (_publishConfirmTimeout == null) return true;
                    else return _model.WaitForConfirms(_publishConfirmTimeout.Value);
                }
            }
            else
            {
                return false;
            }
        }

        public bool PublishCommandResponse(CommandResponseMessage commandResponse, int expiration = 0, bool persistent = false)
        {
            if (EnsureConnected())
            {
                lock (_semaphore)
                {
                    string exchangeName = RMQNameProvider.CreateDeviceExchangeName(commandResponse.MID);
                    string routingKey = MessageRoutingKey.GenerateDeviceCommandResponseRoutingKey(commandResponse.MID, commandResponse.CommandResponse.Id, commandResponse.CommandResponse.Timestamp);
                    byte[] body = Serialize<CommandResponse>(commandResponse.CommandResponse);
                    IBasicProperties properties = GetMessageProperties(persistent, expiration);
                    _model.BasicPublish(exchangeName, routingKey, properties, body);
                    if (_publishConfirmTimeout == null) return true;
                    else return _model.WaitForConfirms(_publishConfirmTimeout.Value);
                }
            }
            else
            {
                return false;
            }
        }

        public bool PublishSystemNotification(SystemNotificationCategory category, SystemNotification notification, int expiration = 0, bool persistent = false)
        {
            if (EnsureConnected())
            {
                lock (_semaphore)
                {
                    string exchangeName = RMQNameProvider.GetRootExchangeName();
                    string routingKey = MessageRoutingKey.GenerateSystemNotificationRoutingKey((int)category);
                    byte[] body = Serialize<SystemNotification>(notification);
                    IBasicProperties properties = GetMessageProperties(persistent, expiration);
                    _model.BasicPublish(exchangeName, routingKey, properties, body);
                    if (_publishConfirmTimeout == null) return true;
                    else return _model.WaitForConfirms(_publishConfirmTimeout.Value);
                }
            }
            else
            {
                return false;
            }
        }

        public bool PublishPulse(Pulse pulse, int expiration = 0, bool persistent = false)
        {
            if (EnsureConnected())
            {
                lock (_semaphore)
                {
                    string exchangeName = RMQNameProvider.CreateDeviceExchangeName(pulse.MID);
                    string routingKey = MessageRoutingKey.GeneratePulseRoutingKey(pulse.MID);
                    byte[] body = Serialize<Pulse>(pulse);
                    IBasicProperties properties = GetMessageProperties(persistent, expiration);
                    _model.BasicPublish(exchangeName, routingKey, properties, body);
                    if (_publishConfirmTimeout == null) return true;
                    else return _model.WaitForConfirms(_publishConfirmTimeout.Value);
                }
            }
            else
            {
                return false;
            }
        }

        public bool PublishSystemPulse(int expiration = 60000, bool persistent = false)
        {
            if (EnsureConnected())
            {
                lock (_semaphore)
                {
                    string exchangeName = RMQNameProvider.GetRootExchangeName();
                    string routingKey = MessageRoutingKey.GenerateSystemPulseRoutingKey();
                    UInt32 unixTime = (UInt32)DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                    IBasicProperties properties = _model.CreateBasicProperties();
                    properties.Persistent = persistent;
                    if (expiration != 0) properties.Expiration = $"{expiration}";
                    byte[] body = Encoding.ASCII.GetBytes(unixTime.ToString());
                    _model.BasicPublish(exchangeName, routingKey, properties, body);
                    if (_publishConfirmTimeout == null) return true;
                    else return _model.WaitForConfirms(_publishConfirmTimeout.Value);
                }
            }
            else
            {
                return false;
            }
        }

        private IBasicProperties GetMessageProperties(bool persistent, int expiration)
        {
            IBasicProperties properties = _model.CreateBasicProperties();
            properties.ContentType = "application/json";
            properties.Persistent = persistent;
            if (expiration != 0) properties.Expiration = $"{expiration}";
            return properties;
        }

        private byte[] Serialize<T>(T o)
        {
            string json = JsonConvert.SerializeObject(o);
            return Encoding.UTF8.GetBytes(json);
        }
    }
}
