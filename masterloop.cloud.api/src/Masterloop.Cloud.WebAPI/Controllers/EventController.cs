using System;
using System.Globalization;
using System.Net;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.Core.Security;
using Masterloop.Core.Types.EventLog;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Masterloop.Cloud.WebAPI.Controllers
{
    /// <summary>
    /// Event API.
    /// </summary>
    [Authorize]
    public class EventController : Controller
    {
        private readonly ISecurityManager _securityManager;
        private readonly IEventLogManager _eventLogManager;

        public EventController(ISecurityManager securityManager, IEventLogManager eventLogManager)
        {
            _securityManager = securityManager;
            _eventLogManager = eventLogManager;
        }

        /// <summary>
        /// Get all events for a device.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <param name="fromTimestamp">From timestamp formatted according to ISO 8601.</param>
        /// <param name="toTimestamp">To timestamp formatted according to ISO 8601.</param>
        /// <returns>Array of DeviceEvent objects in device event log.</returns>
        [HttpGet]
        [Route("api/devices/{MID}/events")]
        [ProducesResponseType(typeof(DeviceEvent[]), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult GetDeviceEvents(string MID, string fromTimestamp, string toTimestamp)
        {
            DevicePermission permission = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, MID);
            if (permission != null && permission.CanObserve)
            {
                DateTime from = DateTime.Parse(fromTimestamp, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal).ToUniversalTime();
                DateTime to = DateTime.Parse(toTimestamp, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal).ToUniversalTime();
                var result = _eventLogManager.GetDeviceEvents(MID, from, to);
                return Ok(result);
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Report an event from a device.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <param name="reportedDeviceEvent">Object of type ReportedDeviceEvent containing event information.</param>
        /// <returns>HTTP response status code.</returns>
        [HttpPost]
        [Route("api/devices/{MID}/events")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult PostDeviceEvent(string MID, [FromBody] ReportedDeviceEvent reportedDeviceEvent)
        {
            if (MID == User.Identity.Name)
            {
                DeviceEvent deviceEvent = new DeviceEvent(DateTime.UtcNow, reportedDeviceEvent.Category, reportedDeviceEvent.Title, reportedDeviceEvent.Body, true);
                _eventLogManager.StoreDeviceEvent(MID, deviceEvent);
                return Ok();
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Get all events for logged in user.
        /// </summary>
        /// <param name="fromTimestamp">From timestamp formatted according to ISO 8601.</param>
        /// <param name="toTimestamp">To timestamp formatted according to ISO 8601.</param>
        /// <returns>Array of UserEvent objects in device event log.</returns>
        [HttpGet]
        [Route("api/myaccount/events")]
        [ProducesResponseType(typeof(UserEvent[]), (int)HttpStatusCode.OK)]
        public IActionResult GetUserEvents(string fromTimestamp, string toTimestamp)
        {
            DateTime from = DateTime.Parse(fromTimestamp, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal).ToUniversalTime();
            DateTime to = DateTime.Parse(toTimestamp, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal).ToUniversalTime();
            var result = _eventLogManager.GetUserEvents(User.Identity.Name, from, to);
            return Ok(result);
        }

        /// <summary>
        /// Get all events for system.
        /// </summary>
        /// <param name="fromTimestamp">From timestamp formatted according to ISO 8601.</param>
        /// <param name="toTimestamp">To timestamp formatted according to ISO 8601.</param>
        /// <returns>Array of SystemEvent objects in device event log.</returns>
        [HttpGet]
        [Route("api/system/events")]
        [ProducesResponseType(typeof(SystemEvent[]), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult GetSystemEvents(string fromTimestamp, string toTimestamp)
        {
            Account account = _securityManager.GetAccount(User.Identity.Name);

            if (account != null && account.IsAdmin)
            {
                DateTime from = DateTime.Parse(fromTimestamp, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal).ToUniversalTime();
                DateTime to = DateTime.Parse(toTimestamp, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal).ToUniversalTime();
                var result = _eventLogManager.GetSystemEvents(from, to);
                return Ok(result);
            }
            else
            {
                return Unauthorized();
            }
        }
    }
}