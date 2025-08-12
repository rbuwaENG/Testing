using Masterloop.Core.Types.Base;
using Masterloop.Core.Types.Commands;
using Masterloop.Core.Types.Devices;
using Masterloop.Core.Types.DevSync;
using Masterloop.Core.Types.Observations;
using System;
using System.Collections.Generic;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Cloud.BusinessLayer.Services.RMQ;
using Masterloop.Cloud.Core.RMQ;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;

namespace Masterloop.Cloud.BusinessLayer.Managers
{
    public class DevSyncManager : IDevSyncManager
    {
        private readonly IDeviceRepository _deviceRepository;
        private readonly ITemplateRepository _templateRepository;
        private readonly ICommandRepository _commandRepository;
        private readonly ISettingsRepository _settingsRepository;
        private readonly IRMQPublishService _rmqPublishService;

        public DevSyncManager(IDeviceRepository deviceRepository, ITemplateRepository templateRepository, ICommandRepository commandRepository, ISettingsRepository settingsRepository, IRMQPublishService rmqPublishService)
        {
            _deviceRepository = deviceRepository;
            _templateRepository = templateRepository;
            _commandRepository = commandRepository;
            _settingsRepository = settingsRepository;
            _rmqPublishService = rmqPublishService;
        }

        public DevSyncResponse Sync(string MID, DevSyncRequest request)
        {
            DetailedDevice device = _deviceRepository.Get(MID);
            DevSyncResponse response = new DevSyncResponse();

            // Handle observations (if any).
            if (request.Observations != null && request.Observations.Length > 0)
            {
                HandleObservations(device, request.Observations);
            }

            // Handle command responses (if any).
            if (request.CommandResponses != null && request.CommandResponses.Length > 0)
            {
                HandleCommandResponses(MID, request.CommandResponses);
            }

            // Retrieve last 30 days un-responded commands that have not expired (if any).
            var commandHistory = _commandRepository.Get(MID, DateTime.UtcNow.AddDays(-30), DateTime.UtcNow);
            if (commandHistory != null)
            {
                List<Command> commands = new List<Command>();
                foreach (CommandHistory command in commandHistory)
                {
                    if (command.ExpiresAt > DateTime.UtcNow && !command.DeliveredAt.HasValue)
                    {
                        commands.Add(new Command()
                        {
                            Id = command.Id,
                            Timestamp = command.Timestamp,
                            ExpiresAt = command.ExpiresAt,
                            Arguments = command.Arguments
                        });
                    }
                }
                response.Commands = commands.ToArray();
            }

            // Handle setting updating (if used).
            /*if (request.SettingsTimestamp != null)
            {
                DateTime currentTimestamp = DateTime.Parse(request.SettingsTimestamp, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal).ToUniversalTime();
                /response.Settings = HandleGetNewDeviceSettings(MID, currentTimestamp);
            }

            // Handle firmware updating (if used).
            if (request.FirmwareReleaseId != 0)
            {
                if (request.FirmwareUseDeltaPatching)
                {
                    response.FirmwarePatchMetadata = await _firmwareService.GetFirmwarePatch(device.Metadata.Id, request.FirmwareReleaseId);
                    if (response.FirmwarePatchMetadata != null)
                    {
                        response.FirmwareBlob = await HandleGetFirmwareBlob(response.FirmwarePatchMetadata.Url);
                    }
                }
                else
                {
                    response.FirmwareReleaseMetadata = await _firmwareService.GetCurrentFirmwareRelease(device.Metadata.Id);
                    if (response.FirmwareReleaseMetadata != null)
                    {
                        response.FirmwareBlob = await HandleGetFirmwareBlob(response.FirmwareReleaseMetadata.Url);
                    }
                }
            }*/

            // Retrieve server time as close to dispatch as possible.
            response.ServerTime = DateTime.UtcNow.ToString("o");

            return response;
        }

        private void HandleObservations(Device device, string observations)
        {
            DeviceTemplate template = _templateRepository.Get(device.MID);
            if (template != null && template.Observations != null)
            {
                Dictionary<int, DataType> observationDataType = new Dictionary<int, DataType>();
                foreach (DeviceObservation o in template.Observations)
                {
                    observationDataType.Add(o.Id, o.DataType);
                }
                CompactObservationPackage cop = new CompactObservationPackage(observations, observationDataType);
                foreach (var io in cop.Package.Observations)
                {
                    List<ObservationMessage> messages = new List<ObservationMessage>();
                    foreach (var o in io.Observations)
                    {
                        ObservationMessage om = new ObservationMessage()
                        {
                            MID = device.MID,
                            Observation = o,
                            ObservationId = io.ObservationId,
                            ObservationType = observationDataType[io.ObservationId]
                        };
                        messages.Add(om);
                    }
                    if (messages.Count > 0)
                    {
                        _rmqPublishService.PublishObservations(messages.ToArray());
                    }
                }
            }
        }

        private void HandleCommandResponses(string MID, CommandResponse[] commandResponses)
        {
            foreach (CommandResponse commandResponse in commandResponses)
            {
                _commandRepository.Update(MID, commandResponse);
            }
        }

        /*private ExpandedSettingsPackage HandleGetNewDeviceSettings(string MID, DateTime currentSettingsTimestamp)
        {
            SettingsPackage deviceSettings = _settingsRepository.Get(MID);
            if (deviceSettings != null && deviceSettings.LastUpdatedOn > currentSettingsTimestamp.AddSeconds(1))  // Add 1 second to be compatible with 32 bits timestamps
            {
                return deviceSettings;
            }
            else
            {
                return null;
            }
        }*/

        /*private string HandleGetFirmwareBlob(string url)
        {
            byte[] firmwareBytes = await GetHttpBlob(url);
            if (firmwareBytes != null)
            {
                return Convert.ToBase64String(firmwareBytes);
            }
            else
            {
                return null;
            }
        }*/
    }
}