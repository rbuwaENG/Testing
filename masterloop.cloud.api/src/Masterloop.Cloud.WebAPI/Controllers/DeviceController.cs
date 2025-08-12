using System;
using System.Collections.Generic;
using System.Net;
using System.Linq;
using Masterloop.Cloud.Core.Security;
using Masterloop.Core.Types.Devices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using System.IO;
using Masterloop.Cloud.Storage.Codecs;

namespace Masterloop.Cloud.WebAPI.Controllers
{
    /// <summary>
    /// Device API.
    /// </summary>
    [Authorize]
    public class DeviceController : Controller
    {
        private readonly IDeviceManager _deviceManager;
        private readonly ISecurityManager _securityManager;
        private readonly ITemplateManager _templateManager;

        private const string _MIME_TYPE_MASTERLOOP_DEVICES = "application/vnd.masterloop.devices";
        private const string _MIME_TYPE_CSV = "text/csv";

        /// <summary>
        /// Constructor.
        /// </summary>
        public DeviceController(IDeviceManager deviceManager, ISecurityManager securityManager, ITemplateManager templateManager)
        {
            _deviceManager = deviceManager;
            _securityManager = securityManager;
            _templateManager = templateManager;
        }

        /// <summary>
        /// Get all devices available to logged in account. Default json, accepts also Content Type="application/vnd.masterloop.devices" for devicelets.
        /// </summary>
        /// <param name="includeMetadata">True to include metadata, False to not include metadata.</param>
        /// <param name="includeDetails">True to include details, False to not include details.</param>
        /// <param name="updatedAfter">Filter and return only devices with UpdatedOn >= updatedAfter (optional).</param>
        /// <param name="query">Set attribute query to only include devices with MID/Name/Description containing query phrase (optional).</param>
        /// <returns>Array of Device objects or null if logged in account has no device permissions.</returns>
        [HttpGet]
        [Route("api/devices")]
        [ProducesResponseType(typeof(DetailedDevice[]), (int)HttpStatusCode.OK)]
        public IActionResult GetDevices([FromQuery] bool includeMetadata, [FromQuery] bool includeDetails, [FromQuery] DateTime? updatedAfter, [FromQuery] string query)
        {
            if (Request.Headers != null && Request.Headers.ContainsKey("Accept") && Request.Headers["Accept"] == _MIME_TYPE_MASTERLOOP_DEVICES)
            {
                // Download as binary devicelets
                DetailedDevice[] devices = GetUserDevices(false, includeDetails, updatedAfter, query);
                byte[] data = Devicelets.WriteBinary(devices);
                MemoryStream stream = new MemoryStream(data);
                return new FileStreamResult(stream, _MIME_TYPE_MASTERLOOP_DEVICES);
            }
            else if (Request.Headers != null && Request.Headers.ContainsKey("Accept") && Request.Headers["Accept"] == _MIME_TYPE_CSV)
            {
                // Download as binary devicelets
                DetailedDevice[] devices = GetUserDevices(false, includeDetails, updatedAfter, query);
                byte[] data = Devicelets.WriteCSV(devices);
                MemoryStream stream = new MemoryStream(data);
                return new FileStreamResult(stream, _MIME_TYPE_MASTERLOOP_DEVICES);
            }
            else
            {
                // Download as Json (Default)
                DetailedDevice[] devices = GetUserDevices(includeMetadata, includeDetails, updatedAfter, query);
                return Ok(devices);
            }
        }

        private DetailedDevice[] GetUserDevices(bool includeMetadata, bool includeDetails, DateTime? updatedAfter, string query)
        {
            List<DetailedDevice> devices = new List<DetailedDevice>();
            TenantPermission[] tenantPermissions = _securityManager.GetTenantPermissionsForAccount(User.Identity.Name);
            foreach (TenantPermission s in tenantPermissions)
            {
                DetailedDevice[] devs = _deviceManager.GetDevicesByTenant(s.TenantId, includeMetadata, includeDetails);
                if (devs != null && devs.Length > 0)
                {
                    foreach (DetailedDevice dev in devs)
                    {
                        // Included devices with MID or Name that includes query filter, or  all if no query filter was specified.
                        if (query == null || (dev.MID != null && dev.MID.Contains(query)) || (dev.Name != null && dev.Name.Contains(query)) || (dev.Description != null && dev.Description.Contains(query)))
                        {
                            devices.Add(dev);
                        }
                    }
                }
            }

            if (updatedAfter.HasValue)
            {
                // Return devices with UpdatedOn or LatestPulse newer than updatedAfter filter.
                return devices.Where(d => d.UpdatedOn >= updatedAfter || (d.LatestPulse.HasValue && d.LatestPulse >= updatedAfter)).OrderBy(x => x.TemplateId).ThenBy(x => x.Name).ToArray();
            }
            else
            {
                return devices.OrderBy(x => x.TemplateId).ThenBy(x => x.Name).ToArray();
            }
        }

        /// <summary>
        /// Get device details.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <returns>DetailedDevice object.</returns>
        [HttpGet]
        [Route("api/devices/{MID}/details")]
        [ProducesResponseType(typeof(DetailedDevice), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult GetDeviceDetails(string MID)
        {
            DevicePermission permission = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, MID);
            if (permission != null && permission.CanObserve)
            {
                var result = _deviceManager.GetDevice(MID, true);
                return Ok(result);
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Get secure device details.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <returns>SecureDetailedDevice object.</returns>
        [HttpGet]
        [Route("api/devices/{MID}/securedetails")]
        [ProducesResponseType(typeof(SecureDetailedDevice), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult GetSecureDeviceDetails(string MID)
        {
            DevicePermission permission = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, MID);
            if (permission != null && permission.CanAdmin)
            {
                var result = _deviceManager.GetSecureDevice(MID, true);
                return Ok(result);
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Get device template.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <returns>DeviceTemplate object.</returns>
        [HttpGet]
        [Route("api/devices/{MID}/template")]
        [ProducesResponseType(typeof(DeviceTemplate), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult GetTemplateForDevice(string MID)
        {
            DevicePermission permission = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, MID);
            if (permission != null && permission.CanObserve)
            {
                Device device = _deviceManager.GetDevice(MID, false);
                var result = _templateManager.GetTemplate(device.TemplateId);
                return Ok(result);
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Get all users with access to this device.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <returns>Array of DevicePermission objects.</returns>
        [HttpGet]
        [Route("api/devices/{MID}/permissions")]
        [ProducesResponseType(typeof(DevicePermission[]), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult GetDevicePermissions(string MID)
        {
            DevicePermission permission = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, MID);
            if (permission != null && permission.CanAdmin)
            {
                var result = _securityManager.GetDevicePermissionsForDevice(MID);
                return Ok(result);
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Get device permissions for device and logged in user.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <returns>DevicePermission object if permission exists, null otherwise.</returns>
        [HttpGet]
        [Route("api/devices/{MID}/permissions/self")]
        [ProducesResponseType(typeof(DevicePermission), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult GetDevicePermissionsForSelf(string MID)
        {
            DevicePermission permission = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, MID);
            if (permission != null && (permission.CanObserve || permission.CanControl || permission.CanAdmin))
            {
                var result = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, MID);
                return Ok(result);
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Creates a new device.
        /// </summary>
        /// <param name="newDevice">New device object.</param>
        /// <returns>DetailedDevice description of newly created device object.</returns>
        [HttpPost]
        [Route("api/devices")]
        [ProducesResponseType(typeof(SecureDetailedDevice), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult CreateDevice([FromBody] NewDevice newDevice)
        {
            if (newDevice == null) return BadRequest("Empty body.");

            // Always validate MID in case user specified it manually.
            if (newDevice.MID != null)
            {
                if (_deviceManager.MIDExists(newDevice.MID))
                {
                    return Conflict($"{newDevice.MID} already exists.");
                }

                try
                {
                    _deviceManager.ValidateMID(newDevice.MID);
                }
                catch (Exception e)
                {
                    return BadRequest(e.Message);
                }
            }

            if (newDevice.PreSharedKey != null)
            {
                if (newDevice.PreSharedKey.Length < 16 || newDevice.PreSharedKey.Length > 64)
                {
                    return BadRequest("Device PreSharedKey must be between 16 and 64 characters long.");
                }
            }

            // Get new device tenant.
            int? tenantId = _templateManager.GetTemplateTenantId(newDevice.TemplateId);
            if (!tenantId.HasValue) return Unauthorized();

            // If duplication, ensure that new device is created for the same template (avoid hostile device takeover).
            // Used to re-try creation of partially created devices.
            DetailedDevice existingDevice = _deviceManager.GetDevice(newDevice.MID, false);
            if (existingDevice != null && existingDevice.TemplateId != newDevice.TemplateId)
            {
                return Unauthorized();
            }

            // Ensure user has Admin permission on tenant.
            TenantPermission[] permissions = _securityManager.GetTenantPermissionsForAccount(User.Identity.Name);
            if (permissions.Any(p => p.TenantId == tenantId))
            {
                TenantPermission tp = permissions.Single(p => p.TenantId == tenantId);
                if (tp.CanAdmin)
                {
                    var result = _deviceManager.CreateDevice(newDevice);
                    if (result != null)
                    {
                        return Ok(result);
                    }
                    else
                    {
                        return BadRequest($"Failed to create device {newDevice.MID}.");
                    }
                }
            }
            return Unauthorized();
        }

        /// <summary>
        /// Updates an existing device.
        /// </summary>
        /// <param name="editedDevice">New device object.</param>
        /// <returns>DetailedDevice description of edited device object.</returns>
        [HttpPost]
        [Route("api/devices/{MID}")]
        [ProducesResponseType(typeof(DetailedDevice), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult UpdateDevice([FromBody] Device editedDevice)
        {
            DevicePermission devicePermission = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, editedDevice.MID);
            if (devicePermission != null && devicePermission.CanControl)
            {
                DetailedDevice existingDevice = _deviceManager.GetDevice(editedDevice.MID, false);
                int? tenantId = _templateManager.GetTemplateTenantId(editedDevice.TemplateId);
                if (!tenantId.HasValue) return Unauthorized();
                TenantPermission[] tenantPermissions = _securityManager.GetTenantPermissionsForAccount(User.Identity.Name);
                if (tenantPermissions.Any(p => p.TenantId == tenantId))
                {
                    TenantPermission tp = tenantPermissions.Single(p => p.TenantId == tenantId);
                    if (tp.CanControl)
                    {
                        var result = _deviceManager.UpdateDevice(editedDevice);
                        return Ok(result);
                    }
                }
            }
            return Unauthorized();
        }

        /// <summary>
        /// Deletes an existing device.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <returns>None</returns>
        [HttpDelete]
        [Route("api/devices/{MID}")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult DeleteDevice(string MID)
        {
            DevicePermission permission = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, MID);
            if (permission != null && permission.CanAdmin)
            {
                _deviceManager.DeleteDevice(MID);
                return Ok();
            }
            else
            {
                return Unauthorized();
            }
        }
    }
}
