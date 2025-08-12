using System;
using System.Collections.Generic;
using System.Globalization;
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
using Masterloop.Core.Types.Observations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Masterloop.Cloud.WebAPI.Controllers
{
    /// <summary>
    /// Observation API.
    /// </summary>
    [Authorize]
    public class ObservationController : Controller
    {
        private readonly IDeviceManager _deviceManager;
        private readonly IObservationManager _observationManager;
        private readonly IEventLogManager _eventLogManager;
        private readonly ISecurityManager _securityManager;

        /// <summary>
        /// Constructor.
        /// </summary>
        public ObservationController(IDeviceManager deviceManager, IObservationManager observationManager, IEventLogManager eventLogManager, ISecurityManager securityManager)
        {
            _deviceManager = deviceManager;
            _observationManager = observationManager;
            _eventLogManager = eventLogManager;
            _securityManager = securityManager;
        }

        /// <summary>
        /// Get the latest observation value for a specified observation identifier.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <param name="observationId">Observation identifier.</param>
        /// <returns>Observation having hte type which the observationId is of, or NULL if no current values exist.</returns>
        [HttpGet]
        [Route("api/devices/{MID}/observations/{observationId}/current")]
        [ProducesResponseType(typeof(Observation), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        public IActionResult GetSingleCurrentObservation(string MID, int observationId)
        {
            DevicePermission permission = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, MID);
            if (permission != null && permission.CanObserve)
            {
                DetailedDevice device = _deviceManager.GetDevice(MID, true);
                if (device != null)
                {
                    DeviceObservation deviceObservation = device.Metadata.Observations.Where(o => o.Id == observationId).First();
                    if (deviceObservation != null)
                    {
                        ExpandedObservationValue value = _observationManager.GetCurrentObservation(MID, observationId, deviceObservation.DataType);
                        if (value != null)
                        {
                            IdentifiedObservation io = new IdentifiedObservation()
                            {
                                ObservationId = observationId,
                                Observation = value.ToObservation()
                            };
                            return Ok(io);
                        }
                        else
                        {
                            return NotFound();
                        }
                    }
                    else
                    {
                        return NotFound();
                    }
                }
                else
                {
                    return NotFound();
                }
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Get the latest observation values for a device.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <returns>Array of current observations for each observation in device.</returns>
        [HttpGet]
        [Route("api/devices/{MID}/observations/current")]
        [ProducesResponseType(typeof(IdentifiedObservation[]), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        public IActionResult GetAllCurrentObservations(string MID)
        {
            DevicePermission permission = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, MID);
            if (permission != null && permission.CanObserve)
            {
                DetailedDevice device = _deviceManager.GetDevice(MID, true);
                if (device != null)
                {
                    if (device.Metadata.Observations != null)
                    {
                        int[] observationIds = device.Metadata.Observations.Select(o => o.Id).ToArray();
                        Dictionary<int, DataType> observationDataType = device.Metadata.Observations
                            .Where(o => observationIds.Contains(o.Id))
                            .Select(o => new { o.Id, o.DataType })
                            .ToDictionary(o => o.Id, o => o.DataType);
                        ExpandedObservationValue[] values = _observationManager.GetCurrentObservations(MID, observationDataType);
                        if (values != null && values.Length > 0)
                        {
                            List<IdentifiedObservation> ios = new List<IdentifiedObservation>();
                            foreach (ExpandedObservationValue value in values)
                            {
                                IdentifiedObservation io = new IdentifiedObservation()
                                {
                                    ObservationId = value.Id,
                                    Observation = value.ToObservation()
                                };
                                ios.Add(io);
                            }
                            return Ok(ios);
                        }
                        else
                        {
                            return NotFound();
                        }
                    }
                    else
                    {
                        return NotFound();
                    }
                }
                else
                {
                    return NotFound();
                }
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Gets the latest observations for device with metadata.
        /// </summary>
        /// <returns>Array of current observations for each observation in device including metadata.</returns>
        /// <param name="MID">Device Identifier.</param>
        [HttpGet]
        [Route("api/devices/{MID}/observations/current2")]
        [ProducesResponseType(typeof(ExpandedObservationValue[]), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        public IActionResult GetAllCurrentObservations2(string MID)
        {
            DevicePermission permission = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, MID);
            if (permission != null && permission.CanObserve)
            {
                DetailedDevice device = _deviceManager.GetDevice(MID, true);
                if (device != null && device.Metadata.Observations != null && device.Metadata.Observations.Length > 0)
                {
                    int[] observationIds = device.Metadata.Observations.Select(o => o.Id).ToArray();
                    Dictionary<int, DataType> observationDataType = device.Metadata.Observations
                        .Where(o => observationIds.Contains(o.Id))
                        .Select(o => new { o.Id, o.DataType })
                        .ToDictionary(o => o.Id, o => o.DataType);
                    ExpandedObservationValue[] result = _observationManager.GetCurrentObservations(MID, observationDataType);
                    return Ok(result);
                }
                return NotFound();
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Get observations for a specified time interval and observation identifier.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <param name="observationId">Observation identifier.</param>
        /// <param name="fromTimestamp">Time interval start.</param>
        /// <param name="toTimestamp">Time interval end.</param>
        /// <returns>Array of observations having the type which the observationId is of.</returns>
        [HttpGet]
        [Route("api/devices/{MID}/observations/{observationId}/observations")]
        [ProducesResponseType(typeof(Observation[]), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        public IActionResult GetObservations(string MID, int observationId, string fromTimestamp, string toTimestamp)
        {
            DevicePermission permission = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, MID);
            if (permission != null && permission.CanObserve)
            {
                DateTime from = DateTime.Parse(fromTimestamp, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal).ToUniversalTime();
                DateTime to = DateTime.Parse(toTimestamp, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal).ToUniversalTime();

                DetailedDevice device = _deviceManager.GetDevice(MID, true);
                if (device != null)
                {
                    DeviceObservation deviceObservation = device.Metadata.Observations.Where(o => o.Id == observationId).First();
                    if (deviceObservation != null)
                    {
                        ExpandedObservationValue[] values = _observationManager.GetObservationHistory(MID, observationId, deviceObservation.DataType, from, to);
                        if (values != null && values.Length > 0)
                        {
                            List<Observation> observations = new List<Observation>();
                            foreach (ExpandedObservationValue value in values)
                            {
                                observations.Add(value.ToObservation());
                            }
                            return Ok(observations);
                        }
                        else
                        {
                            return NotFound();
                        }
                    }
                    else
                    {
                        return NotFound();
                    }
                }
                else
                {
                    return NotFound();
                }
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Submit observation package for multiple observation identifiers in <a href="/docs/CompactObservationFormat.html">Compact Observation Format</a>.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <returns>HTTP response status code.</returns>
        [HttpPost]
        [Route("api/devices/{MID}/observations")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public async Task<IActionResult> PostObservationPackage(string MID)
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
                            string s = Encoding.UTF8.GetString(ms.ToArray());
                            CompactObservationPackage cop = new CompactObservationPackage(s, observationDataType);
                            _observationManager.PublishObservations(MID, cop.Package.Observations, observationDataType);
                            return Ok();
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
                    dli = new DeviceEvent(DateTime.UtcNow, EventCategoryType.Error, "Post observations failed.", e.Message);
                    _eventLogManager.StoreDeviceEvent(MID, dli);
                    return BadRequest();
                }
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Deletes all observations within a specified time interval, for a given device and observation identifier.
        /// Please ensure to use long timeouts in case of many observations need to be deleted.
        /// NOTE: This function in irreversible. Deleting observations has no undo functionality.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <param name="observationId">Observation identifier.</param>
        /// <param name="fromTimestamp">Observations with timestamp greater than or equal will be delete.</param>
        /// <param name="toTimestamp">Observations with timestamp less than or equal will be deleted.</param>
        /// <returns>Number of observations deleted.</returns>
        [HttpDelete]
        [Route("api/devices/{MID}/observations/{observationId}")]
        [ProducesResponseType(typeof(int), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        public ActionResult DeleteObservations(string MID, int observationId, string fromTimestamp, string toTimestamp)
        {
            DevicePermission permission = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, MID);
            if (permission != null && permission.CanAdmin)
            {
                DateTime from = DateTime.Parse(fromTimestamp, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal).ToUniversalTime();
                DateTime to = DateTime.Parse(toTimestamp, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal).ToUniversalTime();

                DetailedDevice device = _deviceManager.GetDevice(MID, true);
                if (device != null)
                {
                    DeviceObservation deviceObservation = device.Metadata.Observations.Where(o => o.Id == observationId).First();
                    if (deviceObservation != null)
                    {
                        var result = _observationManager.DeleteObservationHistory(MID, observationId, from, to);
                        return Ok(result);
                    }
                    else
                    {
                        return NotFound();
                    }
                }
                else
                {
                    return NotFound();
                }
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Deletes all observations for a device.
        /// Please ensure to use long timeouts in case of many observations need to be deleted.
        /// NOTE: This function in irreversible. Deleting observations has no undo functionality.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <returns>Number of observations deleted.</returns>
        [HttpDelete]
        [Route("api/devices/{MID}/observations")]
        [ProducesResponseType(typeof(int), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        public ActionResult DeleteObservations(string MID)
        {
            DevicePermission permission = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, MID);
            if (permission != null && permission.CanAdmin)
            {
                DetailedDevice device = _deviceManager.GetDevice(MID, true);
                if (device != null)
                {
                    var result = _observationManager.DeleteObservationHistory(MID);
                    return Ok(result);
                }
                else
                {
                    return NotFound();
                }
            }
            else
            {
                return Unauthorized();
            }
        }
    }
}