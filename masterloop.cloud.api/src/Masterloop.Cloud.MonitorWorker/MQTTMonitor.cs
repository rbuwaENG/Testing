using System;
using System.Diagnostics;
using System.Reflection;
using Masterloop.Core.Types.Base;
using Masterloop.Core.Types.Commands;
using Masterloop.Core.Types.LiveConnect;
using Masterloop.Core.Types.Observations;
using Masterloop.Plugin.Application;
using Masterloop.Plugin.Device;

namespace Masterloop.Cloud.MonitorWorker
{
    public class MQTTMonitor : IDisposable
    {
        MasterloopLiveConnection _mcs;
        LiveDevice _device;
        string _deviceMID;
        int _cmdId;
        int _obsId;
        DateTime? _startTimestamp;
        bool _oneReceived;
        object _oneToken = new object();
        LiveAppRequest _lar;

        public MQTTMonitor(string mcsAPIHost, string mcsUser, string mcsPasswd, string deviceMID, string loggerMID, string loggerPSK, int cmdId, int obsId)
        {
            _deviceMID = deviceMID;
            _cmdId = cmdId;
            _obsId = obsId;
            _mcs = new MasterloopLiveConnection(mcsAPIHost, mcsUser, mcsPasswd, true);
            _mcs.Metadata = new ApplicationMetadata()
            {
                Application = "MQTTMonitor",
                Reference = Assembly.GetExecutingAssembly().GetName().Version.ToString()
            };
            _lar = new LiveAppRequest()
            {
                MID = deviceMID,
                CommandIds = new int[] { cmdId },
                ObservationIds = new int[] { obsId },
            };
            _mcs.RegisterCommandResponseHandler(deviceMID, cmdId, OnPollSingleCommandResponse);
            _mcs.RegisterObservationHandler(deviceMID, obsId, OnObservationReceived);
            _device = new LiveDevice(loggerMID, loggerPSK, mcsAPIHost);
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        ~MQTTMonitor()
        {
            // Finalizer calls Dispose(false)
            Dispose(false);
        }

        protected virtual void Dispose(bool disposing)
        {
            if (disposing)
            {
                // free managed resources
                _device.Dispose();
                _mcs.Dispose();
            }
        }

        public void Run()
        {
            _startTimestamp = null;
            _oneReceived = false;

            if (!_mcs.IsConnected())
            {
                Trace.TraceWarning("Application not connected, connecting...");
                if (!_mcs.Connect(new LiveAppRequest[] { _lar }))
                {
                    Trace.TraceError("Failed to connect application to MCS: " + _mcs.LastErrorMessage);
                    return;
                }
            }

            if (!_device.IsConnected())
            {
                Trace.TraceWarning("Device not connected, connecting...");
                if (!_device.Connect())
                {
                    Trace.TraceError("Failed to connect device to MCS live server: " + _device.LastErrorMessage);
                    return;
                }
            }

            if (_mcs.IsConnected())
            {

                DateTime startTimestamp = DateTime.UtcNow;

                // Send PollSingle command to device
                Command pollSingleCommand = new Command()
                {
                    Id = _cmdId,
                    Timestamp = startTimestamp,
                    ExpiresAt = startTimestamp.AddMinutes(5),
                    Arguments = new CommandArgument[]
                    {
                        new CommandArgument()
                        {
                            Id = 1,
                            Value = DataTypeStringConverter.FormatInteger(_obsId)
                        }
                    }
                };
                Trace.TraceInformation($"PollSingle");
                if (_mcs.SendCommand(_deviceMID, pollSingleCommand))
                {
                    _startTimestamp = startTimestamp;
                }
                Trace.TraceInformation($"PollSingle DONE");
            }
        }

        private void OnPollSingleCommandResponse(string mid, CommandResponse commandResponse)
        {
            if (_startTimestamp.HasValue && commandResponse.Timestamp.Equals(_startTimestamp))
            {
                TimeSpan cr2a = DateTime.UtcNow - commandResponse.Timestamp;
                Trace.TraceInformation($"CR2A={cr2a.TotalMilliseconds} ms");
                _device.PublishObservation(MLLATENCY.Constants.Observations.CR2A, _startTimestamp.Value, cr2a.TotalMilliseconds);
                Trace.TraceInformation($"CR2A DONE");

                if (commandResponse.DeliveredAt.HasValue)
                {
                    TimeSpan c2d = commandResponse.DeliveredAt.Value - _startTimestamp.Value;
                    Trace.TraceInformation($"C2D={c2d.TotalMilliseconds} ms");
                    _device.PublishObservation(MLLATENCY.Constants.Observations.C2D, _startTimestamp.Value, c2d.TotalMilliseconds);
                    Trace.TraceInformation($"C2D DONE");
                }

                lock (_oneToken)
                {
                    if (_oneReceived)
                    {
                        LogEndToEndLatency();
                    }
                    _oneReceived = true;
                }
            }
        }

        private void OnObservationReceived(string mid, int obsId, IntegerObservation observation)
        {
            if (_startTimestamp.HasValue)
            {
                TimeSpan o2a = DateTime.UtcNow - _startTimestamp.Value;
                Trace.TraceInformation($"O2A={o2a.TotalMilliseconds} ms");
                _device.PublishObservation(MLLATENCY.Constants.Observations.O2A, _startTimestamp.Value, o2a.TotalMilliseconds);
                Trace.TraceInformation($"O2A DONE");

                lock (_oneToken)
                {
                    if (_oneReceived)
                    {
                        LogEndToEndLatency();
                    }
                    _oneReceived = true;
                }
            }
        }

        private void LogEndToEndLatency()
        {
            TimeSpan e2e = DateTime.UtcNow - _startTimestamp.Value;
            Trace.TraceInformation($"E2E={e2e.TotalMilliseconds} ms");
            _device.PublishObservation(MLLATENCY.Constants.Observations.E2E, _startTimestamp.Value, e2e.TotalMilliseconds);
            Trace.TraceInformation($"E2E DONE");
        }
    }
}
