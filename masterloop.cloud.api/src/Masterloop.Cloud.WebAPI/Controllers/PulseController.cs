using System;
using System.Globalization;
using System.Net;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.Core.Security;
using Masterloop.Core.Types.Pulse;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Masterloop.Cloud.WebAPI.Controllers
{
    /// <summary>
    /// Pulse API.
    /// </summary>
    [Authorize]
    public class PulseController : Controller
    {
        private readonly ISecurityManager _securityManager;
        private readonly IPulseManager _pulseManager;

        public PulseController(ISecurityManager securityManager, IPulseManager pulseManager)
        {
            _securityManager = securityManager;
            _pulseManager = pulseManager;
        }

        /// <summary>
        /// Get current pulse period for a device.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <param name="pulseId">Pulse identification number.</param>
        /// <returns>Current PulsePeriod for specified MID/pulseId or null if no pulse exists for MID/pulseId.</returns>
        [HttpGet]
        [Route("api/devices/{MID}/pulse/{pulseId}/current")]
        [ProducesResponseType(typeof(PulsePeriod), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult GetCurrentPulsePeriod(string MID, int pulseId)
        {
            DevicePermission permission = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, MID);
            if (permission != null && permission.CanObserve)
            {
                var result = _pulseManager.GetCurrentPulsePeriod(MID, pulseId);
                return Ok(result);
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Get pulse periods for a device with a specified time interval.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <param name="pulseId">Pulse identification number.</param>
        /// <param name="fromTimestamp">From timestamp formatted according to ISO 8601.</param>
        /// <param name="toTimestamp">To timestamp formatted according to ISO 8601.</param>
        /// <returns>Array of PulsePeriod objects for specified MID/pulseId, having To time within given time interval.</returns>
        [HttpGet]
        [Route("api/devices/{MID}/pulse/{pulseId}")]
        [ProducesResponseType(typeof(PulsePeriod[]), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult GetPulsePeriods(string MID, int pulseId, string fromTimestamp, string toTimestamp)
        {
            DevicePermission permission = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, MID);
            if (permission != null && permission.CanObserve)
            {
                DateTime from = DateTime.Parse(fromTimestamp, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal).ToUniversalTime();
                DateTime to = DateTime.Parse(toTimestamp, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal).ToUniversalTime();
                var result = _pulseManager.GetPulsePeriods(MID, pulseId, from, to);
                return Ok(result);
            }
            else
            {
                return Unauthorized();
            }
        }
    }
}