using System;
using System.Linq;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.BusinessLayer.Services.Units;
using Masterloop.Cloud.Core.Security;
using Masterloop.Cloud.Core.Unit;
using Masterloop.Core.Types.Devices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Masterloop.Cloud.WebAPI.Controllers
{
    /// <summary>
    /// Tool API.
    /// </summary>
    public class ToolController : Controller
    {
        private readonly IDeviceManager _deviceManager;
        private readonly ISecurityManager _securityManager;
        private readonly IUnitService _unitService;

        /// <summary>
        /// Constructor.
        /// </summary>
        public ToolController(IDeviceManager deviceManager, ISecurityManager securityManager, IUnitService unitService)
        {
            _deviceManager = deviceManager;
            _securityManager = securityManager;
            _unitService = unitService;
        }

        /// <summary>
        /// Ping server.
        /// </summary>
        /// <returns>The string "PONG".</returns>
        [HttpGet]
        [Authorize]
        [Route("api/tools/ping")]
        [ProducesResponseType(typeof(string), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult GetPing()
        {
            if (User.Identity.IsAuthenticated)
            {
                var result = "PONG";
                return Ok(result);
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Get server time.
        /// </summary>
        /// <returns>Time formatted according to ISO 8601.</returns>
        [HttpGet]
        [AllowAnonymous]
        [Route("api/tools/servertime")]
        [ProducesResponseType(typeof(string), (int)HttpStatusCode.OK)]
        public IActionResult GetServerTime()
        {
            string result = DateTime.UtcNow.ToString("o");
            return Ok(result);
        }

        /// <summary>
        /// Get server unix time.
        /// </summary>
        /// <returns>Time formatted as unix time string.</returns>
        [HttpGet]
        [AllowAnonymous]
        [Route("api/tools/serverunixtime")]
        public IActionResult GetServerUnixTime()
        {
            string result = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
            return Ok(result);
        }

        /// <summary>
        /// Get signed server time.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <param name="format">Time format ("iso8601" | "unix").</param>
        /// <returns>time;signature</returns>
        [HttpGet]
        [AllowAnonymous]
        [Route("api/devices/{MID}/servertime/{format}")]
        public IActionResult GetServerUnixTime(string MID, string format)
        {
            SecureDetailedDevice device = _deviceManager.GetSecureDevice(MID, false);
            string preSharedKey;
            if (device != null && device.PreSharedKey != null)
            {
                preSharedKey = device.PreSharedKey;
            }
            else
            {
                preSharedKey = "9(Zx" + MID;  // Prevent external parties to spy on estalibed MIDs through this method.
            }
            string timeString = string.Empty;
            if (format == "iso8601")
            {
                timeString = DateTime.UtcNow.ToString("o");
            }
            else if (format == "unix")
            {
                timeString = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
            }
            else
            {
                return BadRequest();
            }
            SHA256 sha256 = SHA256.Create();
            byte[] hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(timeString + preSharedKey));
            string hashString = Convert.ToBase64String(hashBytes.Take(8).ToArray());
            return Ok($"{timeString};{hashString}");
        }

        /// <summary>
        /// Returns a unique new MID.
        /// </summary>
        /// <returns>Array of DevicePermission objects.</returns>
        [HttpGet]
        [Authorize]
        [Route("api/tools/uniquemid")]
        [ProducesResponseType(typeof(string), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult UniqueMID()
        {
            if (User.Identity.IsAuthenticated)
            {
                var result = _deviceManager.GetMID();
                return Ok($"\"{result}\"");
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Count active devices within specified year and month.
        /// </summary>
        /// <param name="tenantId">Tenant identifier.</param>
        /// <param name="year">Year to count.</param>
        /// <param name="month">Month to count.</param>
        /// <returns>Number of active devices in year/month for tenant.</returns>
        [HttpGet]
        [Authorize]
        [Route("api/tools/devicecounter")]
        [ProducesResponseType(typeof(int), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult GetActiveDeviceCount(int tenantId, int year, int month)
        {
            Account account = _securityManager.GetAccount(User.Identity.Name);
            if (account != null && account.IsAdmin)
            {
                int counter = 0;
                DetailedDevice[] devices = _deviceManager.GetDevicesByTenant(tenantId, false, true);
                DateTime from = new DateTime(year, month, 1);
                DateTime to = new DateTime(year, month, 1).AddMonths(1);
                foreach (DetailedDevice device in devices)
                {
                    if (device.CreatedOn < to)
                    {
                        DateTime? pulse = device.LatestPulse;
                        if (pulse.HasValue && pulse.Value > from)
                        {
                            counter++;
                        }
                    }
                }
                return Ok(counter);
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Return Masterloop Units table.
        /// </summary>
        /// <returns>Masterloop Unit Table.</returns>
        [HttpGet]
        [Authorize]
        [Route("api/tools/units")]
        [ProducesResponseType(typeof(UnitTable), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult GetUnits()
        {
            UnitTable table = _unitService.GetUnitTable();
            return Ok(table);
        }
    }
}