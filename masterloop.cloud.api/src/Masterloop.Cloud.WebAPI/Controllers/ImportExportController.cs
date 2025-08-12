using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.Core.Security;
using Masterloop.Core.Types.Base;
using Masterloop.Core.Types.Devices;
using Masterloop.Core.Types.EventLog;
using Masterloop.Core.Types.ImportExport;
using Masterloop.Core.Types.Observations;
using Masterloop.Core.Types.Pulse;
using Masterloop.Core.Types.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Masterloop.Cloud.WebAPI.Controllers
{
    /// <summary>
    /// Import/Export API.
    /// </summary>
    [Authorize]
    public class ImportExportController : Controller
    {
        private readonly IDeviceManager _deviceManager;
        private readonly ISecurityManager _securityManager;
        private readonly IObservationManager _observationManager;
        private readonly ISettingsManager _settingsManager;
        private readonly IPulseManager _pulseManager;
        private readonly IEventLogManager _eventLogManager;
        private readonly ITemplateManager _templateManager;

        /// <summary>
        /// Constructor.
        /// </summary>
        public ImportExportController(IDeviceManager deviceManager, ISecurityManager securityManager,
                                      IObservationManager observationManager, ISettingsManager settingsManager,
                                      IPulseManager pulseManager, IEventLogManager eventLogManager, ITemplateManager templateManager)
        {
            _deviceManager = deviceManager;
            _securityManager = securityManager;
            _observationManager = observationManager;
            _settingsManager = settingsManager;
            _pulseManager = pulseManager;
            _eventLogManager = eventLogManager;
            _templateManager = templateManager;
        }

        /// <summary>
        /// Import observations from device without publishing to broker, using package for multiple observation identifiers in <a href="/docs/CompactObservationFormat.html">Compact Observation Format</a>.
        /// Useful when importing larger volumes of data from occationally connected, or high volume sampling devices.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <returns>HTTP response status code.</returns>
        [HttpPost]
        [Route("api/devices/{MID}/observations/import")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public async Task<IActionResult> PostImportObservationPackage(string MID)
        {
            if (MID == User.Identity.Name)
            {
                try
                {
                    DetailedDevice device = _deviceManager.GetDevice(MID, true);
                    Dictionary<int, DataType> observationDataType = new Dictionary<int, DataType>();
                    foreach (DeviceObservation o in device.Metadata.Observations)
                    {
                        observationDataType.Add(o.Id, o.DataType);
                    }
                    string contentType = Request.ContentType;
                    if (contentType == "text/csv")
                    {
                        using (MemoryStream ms = new MemoryStream())
                        {
                            await Request.Body.CopyToAsync(ms);
                            string s = Encoding.UTF8.GetString(ms.GetBuffer());
                            CompactObservationPackage cop = new CompactObservationPackage(s, observationDataType);
                            if (_observationManager.StoreObservations(MID, cop.Package.Observations, observationDataType))
                            {
                                return Ok();
                            }
                            else
                            {
                                return BadRequest("Failed to import and store observations.");
                            }
                        }
                    }
                    else
                    {
                        return BadRequest("Unsupported content type");
                    }
                }
                catch (Exception e)
                {
                    DeviceEvent dli = null;
                    dli = new DeviceEvent(DateTime.UtcNow, EventCategoryType.Error, "Observation import failed.", e.Message);
                    _eventLogManager.StoreDeviceEvent(MID, dli);
                    return BadRequest(e.Message);
                }
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Get the latest observation, setting values and pulse periods for a group of devices. Note: All devices must have the same observation definition.
        /// </summary>
        /// <param name="snapshotRequest">Snapshot request object.</param>
        /// <returns>Array of current SnapshotItem objects.</returns>
        [HttpPost]
        [Route("api/tools/snapshot/current")]
        [ProducesResponseType(typeof(SnapshotItem[]), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        public IActionResult GetCurrentSnapshot([FromBody] SnapshotRequest snapshotRequest)
        {
            if (snapshotRequest == null)
            {
                return BadRequest("The snapshotRequest object is null or of incorrect type.");
            }

            // Select devices
            string[] mids = null;
            DeviceTemplate template = null;
            if (snapshotRequest.TID != null)  // Load all devices for TID
            {
                TemplatePermission permission = _securityManager.GetTemplatePermissionForAccountAndTemplate(User.Identity.Name, snapshotRequest.TID);
                if (permission == null || permission.CanObserve == false)
                {
                    return Unauthorized();
                }
                DetailedDevice[] devices = _deviceManager.GetDevicesByTemplate(snapshotRequest.TID, false, false);
                if (devices != null && devices.Length > 0)
                {
                    mids = devices.Select(d => d.MID).ToArray();
                    template = _templateManager.GetTemplate(devices[0].TemplateId);
                }
            }
            else  // Check that all individual devices refer to the same TID
            {
                if (snapshotRequest.MIDs != null && snapshotRequest.MIDs.Length > 0)
                {
                    DetailedDevice[] devices = _deviceManager.GetDevices(snapshotRequest.MIDs, false);  // Assume that all devices are of the same template.
                    if (devices != null && devices.Length > 0 && devices.Length == snapshotRequest.MIDs.Length)
                    {
                        foreach (DetailedDevice device in devices)
                        {
                            if (device.TemplateId != devices[0].TemplateId)
                            {
                                return BadRequest("All devices must be belong to the same template.");
                            }
                        }
                        mids = snapshotRequest.MIDs;
                        template = _templateManager.GetTemplate(devices[0].TemplateId);
                    }
                    else
                    {
                        return NotFound("One or more specified MIDs not found.");
                    }
                }
                else
                {
                    return BadRequest("No MIDs specified in request.");
                }
            }

            // Check that we have some MIDs, if not throw exception.
            if (mids == null || mids.Length < 1)
            {
                return NotFound("System found no devices matching the request.");
            }

            // Check that user has observation permissions for all requested MIDs.
            DevicePermission permissions = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, mids[0]);
            if (permissions == null || permissions.CanObserve == false)
            {
                return Unauthorized();
            }

            // Allocate response object
            List<SnapshotItem> snapshots = new List<SnapshotItem>();
            foreach (string MID in mids)
            {
                SnapshotItem snapshot = new SnapshotItem()
                {
                    MID = MID,
                    Observations = null,
                    Settings = null,
                    PulsePeriods = null
                };
                snapshots.Add(snapshot);
            }

            // Get observations
            if (snapshotRequest.AllObservations || (snapshotRequest.ObservationIds != null && snapshotRequest.ObservationIds.Length > 0))
            {
                if (template != null && template.Observations != null && template.Observations.Length > 0)
                {
                    int[] observationIds = snapshotRequest.AllObservations ? template.Observations.Select(o => o.Id).ToArray() : snapshotRequest.ObservationIds;
                    Dictionary<int, DataType> observationDataType = template.Observations.Select(o => new { o.Id, o.DataType }).ToDictionary(o => o.Id, o => o.DataType);
                    foreach (string MID in mids)
                    {
                        ExpandedObservationValue[] obsValues = _observationManager.GetCurrentObservations(MID, observationDataType);
                        if (snapshotRequest.AllObservations)
                        {
                            snapshots.Single(s => s.MID == MID).Observations = obsValues.ToArray();
                        }
                        else
                        {
                            snapshots.Single(s => s.MID == MID).Observations = obsValues.Where(o => snapshotRequest.ObservationIds.Contains(o.Id)).ToArray();
                        }
                    }
                }
            }

            // Get settings
            if (snapshotRequest.AllSettings || (snapshotRequest.SettingIds != null && snapshotRequest.SettingIds.Length > 0))
            {
                foreach (string MID in mids)
                {
                    ExpandedSettingsPackage setPkg = _settingsManager.GetExpandedDeviceSettings(MID);
                    if (setPkg != null && setPkg.Values != null && setPkg.Values.Length > 0)
                    {
                        if (snapshotRequest.AllSettings)
                        {
                            snapshots.Single(s => s.MID == MID).Settings = setPkg.Values.ToArray();
                        }
                        else
                        {
                            snapshots.Single(s => s.MID == MID).Settings = setPkg.Values.Where(s => snapshotRequest.SettingIds.Contains(s.Id)).ToArray();
                        }
                    }
                }
            }

            // Get pulses
            if (snapshotRequest.PulseIds != null && snapshotRequest.PulseIds.Length > 0)
            {
                foreach (string MID in mids)
                {
                    List<IdentifiedPulsePeriod> pulsePeriods = new List<IdentifiedPulsePeriod>();
                    foreach (int pulseId in snapshotRequest.PulseIds)
                    {
                        PulsePeriod pulsePeriod = _pulseManager.GetCurrentPulsePeriod(MID, pulseId);
                        if (pulsePeriod != null)
                        {
                            IdentifiedPulsePeriod ipp = new IdentifiedPulsePeriod()
                            {
                                Id = pulseId,
                                From = pulsePeriod.From,
                                To = pulsePeriod.To,
                                PulseCount = pulsePeriod.PulseCount
                            };
                            pulsePeriods.Add(ipp);
                        }
                    }
                    if (pulsePeriods.Count > 0)
                    {
                        snapshots.Single(s => s.MID == MID).PulsePeriods = pulsePeriods.ToArray();
                    }
                }
            }

            return Ok(snapshots.ToArray());
        }
    }
}