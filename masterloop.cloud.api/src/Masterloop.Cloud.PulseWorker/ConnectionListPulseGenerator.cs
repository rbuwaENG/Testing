using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using Masterloop.Cloud.BusinessLayer.Services.RMQ;
using Masterloop.Cloud.Core.RMQ.API;
using Masterloop.Core.Types.Pulse;

namespace Masterloop.Cloud.PulseWorker
{
    public class ConnectionListPulseGenerator : IPulseGenerator
    {
        public bool IsRunning { get; set; }
        private readonly RMQAdminClient _rmqAdmin;
        private readonly List<PulseState> _deviceCache;
        private readonly int _intervalSeconds;
        private readonly int _pulseTTLSeconds;
        private readonly string _messagingConnectionString;
        private readonly string[] _prefixes;

        public ConnectionListPulseGenerator(string rmqConnectionString, int intervalSeconds, int pulseTTLSeconds, string[] prefixes)
        {
            _rmqAdmin = new RMQAdminClient(rmqConnectionString);
            _deviceCache = new List<PulseState>();
            _intervalSeconds = intervalSeconds;
            _pulseTTLSeconds = pulseTTLSeconds;
            _messagingConnectionString = rmqConnectionString;
            _prefixes = prefixes;
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        ~ConnectionListPulseGenerator()
        {
            // Finalizer calls Dispose(false)
            Dispose(false);
        }

        protected virtual void Dispose(bool disposing)
        {
            if (disposing)
            {
                // free managed resources
            }
        }

        public bool Init()
        {
            return true;
        }

        public bool Run()
        {
            IsRunning = true;

            using (RMQPublishService rmqPublisher = new RMQPublishService(_messagingConnectionString, null))  // Fire and forget mode.
            {
                while (this.IsRunning)
                {
                    try
                    {
                        if (!rmqPublisher.IsConnected())
                        {
                            Trace.TraceWarning("(Re)connecting to RMQ.");
                            if (!rmqPublisher.Connect())
                            {
                                Trace.TraceError("Failed to connect to RMQ");
                            }
                        }
                        else
                        {
                            DateTime t = DateTime.UtcNow;
                            List<ConnectionInfo> connections = _rmqAdmin.GetConnections().ToList();
                            string[] connectedUsers = connections.Select(c => c.user).ToArray();
                            TimeSpan ts = DateTime.UtcNow - t;
                            Trace.TraceInformation($"RMQ GetConnectedUsers returned {connectedUsers.Length} connections in {ts.TotalSeconds:.0} seconds.");
                            foreach (string user in connectedUsers)
                            {
                                try
                                {
                                    if (user.Contains("@@@"))
                                    {
                                        continue;
                                    }
                                    bool prefixFound = false;
                                    foreach (string prefix in _prefixes)
                                    {
                                        if (user.StartsWith(prefix))
                                        {
                                            prefixFound = true;
                                            break;
                                        }
                                    }
                                    if (prefixFound)
                                    {
                                        if (_deviceCache.Any(c => c.MID == user))
                                        {
                                            PulseState device = _deviceCache.First(c => c.MID == user);

                                            if (DateTime.UtcNow >= device.NextPulse)
                                            {
                                                Pulse pulse = new Pulse()
                                                {
                                                    MID = device.MID,
                                                    Timestamp = DateTime.UtcNow,
                                                    PulseId = 0  // Device Pulse
                                                };
                                                rmqPublisher.PublishPulse(pulse, _pulseTTLSeconds * 1000, false);
                                                device.NextPulse = DateTime.UtcNow.AddSeconds(_intervalSeconds);
                                            }
                                        }
                                        else
                                        {
                                            PulseState pulseState = new PulseState()
                                            {
                                                MID = user,
                                                NextPulse = DateTime.UtcNow
                                            };
                                            _deviceCache.Add(pulseState);
                                        }
                                    }
                                }
                                catch (Exception e)
                                {
                                    Trace.TraceError($"{user} exception {e.Message}");
                                }
                            }
                        }
                    }
                    catch (Exception e)
                    {
                        Trace.TraceError($"Exception: {e.Message}");
                    }

                    // Avoid 100% CPU
                    Thread.Sleep(30 * 1000);
                }
            }
            return true;
        }
    }
}