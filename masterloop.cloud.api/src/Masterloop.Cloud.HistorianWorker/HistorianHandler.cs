using Masterloop.Cloud.BusinessLayer.Services.Cache;
using Masterloop.Cloud.Core.RMQ;
using Masterloop.Cloud.HistorianWorker.Consumers;
using Masterloop.Cloud.Storage.Providers;
using Masterloop.Cloud.Storage.Repositories;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.EventLog;
using RabbitMQ.Client;
using System;
using System.Threading;

namespace Masterloop.Cloud.HistorianWorker
{
    public class HistorianHandler : IDisposable
    {
        private string _rabbitMqQueueName;
        private int _rabbitMqPrefetchCount;
        private const int RabbitMqRequestedHeartbeat = 30;
        private const int _MAXIMUM_TIME_IN_BUFFER_SECONDS = 10;
        private DateTime _nextForcedProcessBatch = DateTime.UtcNow.AddSeconds(_MAXIMUM_TIME_IN_BUFFER_SECONDS);

        private ConsumerType _consumerType;

        private HistorianConsumer _consumer;
        private IConnection _brokerConnection;
        private IModel _brokerChannel;
        private ConnectionFactory _rmqFactory;
        private ICacheProvider _cacheProvider;
        private IDbProvider _dbProvider;
        private int _batchSize;
        private IDeviceRepository _deviceRepository;
        private ITemplateRepository _templateRepository;
        private IEventLogRepository _eventLogRepository;
        private DeviceCache _deviceCache;

        public HistorianHandler(
            MessagingConnection rmqConnection,
            string queueName,
            int prefetchCount,
            ConsumerType consumerType,
            string pgsqlConnectionString,
            string redisConnectionString,
            int batchSize)
        {
            _rmqFactory = new ConnectionFactory
            {
                HostName = rmqConnection.HostName,
                UserName = rmqConnection.Username,
                Password = rmqConnection.Password,
                RequestedHeartbeat = new TimeSpan(0, 0, RabbitMqRequestedHeartbeat),
            };
            if (rmqConnection.Encrypted)
            {
                _rmqFactory.Ssl = new SslOption() { Enabled = true, ServerName = rmqConnection.HostName, Version = System.Security.Authentication.SslProtocols.Tls12 };
            }
            _rabbitMqQueueName = queueName;
            _rabbitMqPrefetchCount = prefetchCount;

            _consumerType = consumerType;
            _batchSize = batchSize;

            _cacheProvider = new RedisCacheProvider(redisConnectionString);
            _dbProvider = new PostgreSqlDbProvider(pgsqlConnectionString);
            _eventLogRepository = new EventLogRepository(_dbProvider);
            _deviceRepository = new DeviceRepository(_cacheProvider);
            _templateRepository = new TemplateRepository(_cacheProvider);
            _deviceCache = new DeviceCache(_deviceRepository, _templateRepository);
        }

        public void Run()
        {
            // Ensure is connected
            if (_consumer != null && _consumer.IsRunning)
            {
                if (DateTime.UtcNow > _nextForcedProcessBatch && _batchSize > 1)
                {
                    _consumer.Flush();
                    _nextForcedProcessBatch = DateTime.UtcNow.AddSeconds(_MAXIMUM_TIME_IN_BUFFER_SECONDS);
                }
                return;
            }
            else
            {
                DisposeAllConnectionObjects();
                try
                {
                    _brokerConnection = _rmqFactory.CreateConnection();
                    _brokerChannel = _brokerConnection.CreateModel();
                    _brokerChannel.BasicQos(0, (ushort)_rabbitMqPrefetchCount, false);

                    switch (_consumerType)
                    {
                        case ConsumerType.Command:
                            _consumer = new CommandConsumer(_brokerChannel, new CommandRepository(_dbProvider), _batchSize, _deviceCache);
                            break;
                        case ConsumerType.Event:
                            _consumer = new EventConsumer(_brokerChannel, new EventLogRepository(_dbProvider), _batchSize, _deviceCache);
                            break;
                        case ConsumerType.Observation:
                            _consumer = new ObservationConsumer(_brokerChannel, new ObservationRepository(_cacheProvider, _dbProvider), _batchSize, _deviceCache);
                            break;
                        case ConsumerType.Pulse:
                            _consumer = new PulseConsumer(_brokerChannel, new PulseRepository(_cacheProvider, _dbProvider), _batchSize, _deviceCache);
                            break;
                        case ConsumerType.ObservationStatistics:
                            _consumer = new ObservationStatisticsConsumer(_brokerChannel, new ObservationRepository(_cacheProvider, _dbProvider), _batchSize, _deviceCache);
                            break;
                        default:
                            throw new ArgumentException($"Unknown consumer type: {_consumerType}");
                    }
                    _brokerChannel.BasicConsume(_rabbitMqQueueName, false, _consumer);
                }
                catch (RabbitMQ.Client.Exceptions.BrokerUnreachableException e)
                {
                    _eventLogRepository.Create(new SystemEvent(DateTime.UtcNow, EventCategoryType.Error, "HistorianHandler: Not able to connect to Broker. Waiting 5 seconds.", e.Message));
                    Thread.Sleep(5 * 1000);
                }
            }
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        ~HistorianHandler()
        {
            // Finalizer calls Dispose(false)
            Dispose(false);
        }

        protected virtual void Dispose(bool disposing)
        {
            if (disposing)
            {
                // free managed resources
                DisposeAllConnectionObjects();
            }
        }

        private void DisposeAllConnectionObjects()
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
                _brokerConnection.Dispose();
                _brokerConnection = null;
            }
        }
    }
}