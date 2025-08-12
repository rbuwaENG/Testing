using System;
using System.Net;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.Core.Security;
using Masterloop.Core.Types.EventLog;
using Masterloop.Core.Types.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Masterloop.Cloud.WebAPI.Controllers
{
    /// <summary>
    /// Setting API.
    /// </summary>
    [Authorize]
    public class SettingController : Controller
    {
        private readonly ISettingsManager _settingsManager;
        private readonly IEventLogManager _eventLogManager;
        private readonly ISecurityManager _securityManager;

        /// <summary>
        /// Constructor.
        /// </summary>
        public SettingController(ISettingsManager settingsManager, IEventLogManager eventLogManager, ISecurityManager securityManager)
        {
            _settingsManager = settingsManager;
            _eventLogManager = eventLogManager;
            _securityManager = securityManager;
        }

        /// <summary>
        /// Get device settings.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <returns>Device settings.</returns>
        [HttpGet]
        [Route("api/devices/{MID}/settings")]
        [ProducesResponseType(typeof(SettingsPackage), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult GetSettings(string MID)
        {
            bool isAuthorized = false;
            if (MID == User.Identity.Name)
            {
                isAuthorized = true;
            }
            else
            {
                DevicePermission permission = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, MID);
                if (permission != null && permission.CanObserve)
                {
                    isAuthorized = true;
                }
            }
            if (isAuthorized)
            {
                try
                {
                    var result = _settingsManager.GetDeviceSettings(MID);
                    return Ok(result);
                }
                catch (Exception e)
                {
                    DeviceEvent dli = null;
                    dli = new DeviceEvent(DateTime.UtcNow, EventCategoryType.Warning, "Get settings failed.", e.Message);
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
        /// Get device expanded settings.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <returns>Expanded device settings.</returns>
        [HttpGet]
        [Route("api/devices/{MID}/settings/expanded")]
        [ProducesResponseType(typeof(ExpandedSettingsPackage), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult GetExpandedSettings(string MID)
        {
            bool isAuthorized = false;
            if (MID == User.Identity.Name)
            {
                isAuthorized = true;
            }
            else
            {
                DevicePermission permission = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, MID);
                if (permission != null && permission.CanObserve)
                {
                    isAuthorized = true;
                }
            }
            if (isAuthorized)
            {
                try
                {
                    var result = _settingsManager.GetExpandedDeviceSettings(MID);
                    return Ok(result);
                }
                catch (Exception e)
                {
                    DeviceEvent dli = null;
                    dli = new DeviceEvent(DateTime.UtcNow, EventCategoryType.Warning, "Get expanded settings failed.", e.Message);
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
        /// Sets new settings for a device.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <param name="values">Array of SettingValue objects.</param>
        /// <returns>HTTP response status code.</returns>
        [HttpPost]
        [Route("api/devices/{MID}/settings")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult SetSettings(string MID, [FromBody] SettingValue[] values)
        {
            DevicePermission permission = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, MID);
            if (permission != null && permission.CanControl)
            {
                try
                {
                    if (values != null)
                    {
                        _settingsManager.SetDeviceSettings(MID, values);
                        return Ok();
                    }
                    else
                    {
                        return BadRequest("Setting values cannot be null.");
                    }
                }
                catch (Exception e)
                {
                    DeviceEvent dli = null;
                    dli = new DeviceEvent(DateTime.UtcNow, EventCategoryType.Error, "Set settings failed.", e.Message);
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
        /// Sets new settings for multiple devices.
        /// </summary>
        /// <param name="settings">Array of SettingsPackage objects.</param>
        /// <returns>HTTP response status code.</returns>
        [HttpPost]
        [Route("api/tools/multisettings")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult SetMultipleDeviceSettings([FromBody] SettingsPackage[] settings)
        {
            if (settings != null && settings.Length > 0)
            {
                foreach (SettingsPackage package in settings)
                {
                    IActionResult result = SetSettings(package.MID, package.Values);
                    if (result.GetType() != typeof(OkResult)) return result;
                }
                return Ok();
            }
            else
            {
                return BadRequest("Settings cannot be null or empty.");
            }
        }
    }
}