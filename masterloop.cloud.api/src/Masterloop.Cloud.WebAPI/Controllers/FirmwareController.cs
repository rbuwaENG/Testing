using System;
using System.Collections.Generic;
using System.Net;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.Core.Security;
using Masterloop.Cloud.Core.Tenant;
using Masterloop.Cloud.Storage.Codecs;
using Masterloop.Core.Types.Devices;
using Masterloop.Core.Types.EventLog;
using Masterloop.Core.Types.Firmware;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Masterloop.Cloud.WebAPI.Controllers
{
    /// <summary>
    /// Firmware API.
    /// </summary>
    [Authorize]
    public class FirmwareController : Controller
    {
        private readonly IFirmwareManager _firmwareManager;
        private readonly IDeviceManager _deviceManager;
        private readonly ISecurityManager _securityManager;
        private readonly IEventLogManager _eventLogManager;
        private readonly ITenantManager _tenantManager;
        private readonly ITemplateManager _templateManager;

        /// <summary>
        /// Constructor.
        /// </summary>
        public FirmwareController(IFirmwareManager firmwareManager, IDeviceManager deviceManager, ISecurityManager securityManager, IEventLogManager eventLogManager, ITenantManager tenantManager, ITemplateManager templateManager)
        {
            _firmwareManager = firmwareManager;
            _deviceManager = deviceManager;
            _securityManager = securityManager;
            _eventLogManager = eventLogManager;
            _tenantManager = tenantManager;
            _templateManager = templateManager;
        }

        /// <summary>
        /// Get description of current firmware release.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <returns>FirmwareReleaseDescriptor object describing the current firmware release.</returns>
        [HttpGet]
        [Route("api/devices/{MID}/firmware/current")]
        [ProducesResponseType(typeof(FirmwareReleaseDescriptor), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult GetCurrentFirmware(string MID)
        {
            if (MID == User.Identity.Name)
            {
                DetailedDevice device = _deviceManager.GetDevice(MID, false);
                if (device != null)
                {
                    FirmwareReleaseDescriptor frd = _firmwareManager.GetCurrentFirmwareRelease(device.TemplateId);
                    if (frd != null)
                    {
                        frd.Url = _firmwareManager.GetFirmwareReleaseBlobUrl(HttpContext.Request.Host.Value, device.TemplateId, frd);
                        return Ok(frd);
                    }
                    else
                    {
                        return NotFound();
                    }
                }
                else
                {
                    return NotFound("Unknown MID: " + MID);
                }
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Get description of a specified firmware version.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <param name="versionNo">Version number.</param>
        /// <returns>FirmwareReleaseDescriptor object describing the specified firmware release.</returns>
        [HttpGet]
        [Route("api/devices/{MID}/firmware/{versionNo}")]
        [ProducesResponseType(typeof(FirmwareReleaseDescriptor), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult GetSpecifiedFirmware(string MID, string versionNo)
        {
            if (MID == User.Identity.Name)
            {
                DetailedDevice device = _deviceManager.GetDevice(MID, false);
                if (device != null)
                {
                    FirmwareReleaseDescriptor frd = _firmwareManager.GetFirmwareRelease(device.TemplateId, versionNo);
                    if (frd != null)
                    {
                        frd.Url = _firmwareManager.GetFirmwareReleaseBlobUrl(HttpContext.Request.Host.Value, device.TemplateId, frd);
                        return Ok(frd);
                    }
                    else
                    {
                        return NotFound($"Firmware versionNo {versionNo} not found for device {MID} of template {device.TemplateId}.");
                    }
                }
                else
                {
                    return NotFound("Unknown MID: " + MID);
                }
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Get description of firmware patch.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <param name="fromVersionNo">Current firmware version number on device that is to be updated.</param>
        /// <returns>FirmwarePatchDescriptor object describing the firmware update patch.</returns>
        [HttpGet]
        [Route("api/devices/{MID}/firmware/patch/{fromVersionNo}")]
        [Route("api/devices/{MID}/firmware/patch/{fromVersionNo}/{encoding}")]
        [ProducesResponseType(typeof(FirmwarePatchDescriptor), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult GetFirmwarePatch(string MID, string fromVersionNo)
        {
            if (MID == User.Identity.Name)
            {
                DetailedDevice device = _deviceManager.GetDevice(MID, false);
                if (device != null)
                {
                    FirmwarePatchDescriptor fpd = _firmwareManager.GetCurrentFirmwarePatch(device.TemplateId, fromVersionNo);
                    if (fpd != null)
                    {
                        fpd.Url = _firmwareManager.GetFirmwarePatchBlobUrl(HttpContext.Request.Host.Value, device.TemplateId, fpd);
                        return Ok(fpd);
                    }
                    else
                    {
                        return NotFound();
                    }
                }
                else
                {
                    return NotFound(new ArgumentException("Unknown MID: " + MID));
                }
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Publish a new firmware release for a device template.
        /// </summary>
        /// <param name="TID">Device template identifier.</param>
        /// <param name="firmwareRelease">FirmwareRelease object describing the firmware release.</param>
        /// <returns>HTTP response status code.</returns>
        [HttpPost]
        [Route("api/templates/{TID}/firmware")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult PublishFirmware(string TID, [FromBody] FirmwareRelease firmwareRelease)
        {
            TemplatePermission dtp = _securityManager.GetTemplatePermissionForAccountAndTemplate(User.Identity.Name, TID);
            if (dtp != null && dtp.CanAdmin)
            {
                int? tenantId = _templateManager.GetTemplateTenantId(TID);
                if (tenantId == null || (tenantId.HasValue && !_tenantManager.HasFeature(tenantId.Value, AddOnFeature.Firmware)))
                {
                    return Unauthorized();
                }
                UserEvent uli = null;
                try
                {
                    if (firmwareRelease != null)
                    {
                        _firmwareManager.CreateFirmwareRelease(firmwareRelease);
                        return Ok();
                    }
                    else
                    {
                        return BadRequest("Firmware release object cannot be null.");
                    }
                }
                catch (Exception e)
                {
                    uli = new UserEvent(DateTime.UtcNow, EventCategoryType.Error, "Publishing of firmware failed for templateId " + TID, e.Message);
                    _eventLogManager.StoreUserEvent(User.Identity.Name, uli);
                    return BadRequest(e.Message);
                }
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Set current firmware for device template.
        /// </summary>
        /// <param name="TID">Template identifier.</param>
        /// <param name="releaseId">Firmware release identifier.</param>
        /// <returns>OK if template was updated, otherwise relevant status code with a textual explaination of the error occured.</returns>
        [HttpPut]
        [Route("api/templates/{TID}/firmware/current")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult SetCurrentFirmware(string TID, [FromBody] int releaseId)
        {
            return SetCurrentFirmware(TID, null, releaseId);
        }

        /// <summary>
        /// Set current firmware for device template.
        /// </summary>
        /// <param name="TID">Template identifier.</param>
        /// <param name="variantId">Firmware variant identifier.</param>
        /// <param name="releaseId">Firmware release identifier.</param>
        /// <returns>OK if template was updated, otherwise relevant status code with a textual explaination of the error occured.</returns>
        [HttpPut]
        [Route("api/templates/{TID}/firmware/{variantId}/current")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult SetCurrentFirmware(string TID, int? variantId, [FromBody] int releaseId)
        {
            TemplatePermission dtp = _securityManager.GetTemplatePermissionForAccountAndTemplate(User.Identity.Name, TID);
            if (dtp != null && dtp.CanAdmin)
            {
                string templateId = _firmwareManager.GetFirmwareReleaseTemplate(releaseId);
                if (templateId != null && templateId == TID)
                {
                    int? tenantId = _templateManager.GetTemplateTenantId(TID);
                    if (tenantId == null || (tenantId.HasValue && !_tenantManager.HasFeature(tenantId.Value, AddOnFeature.Firmware)))
                    {
                        return Unauthorized();
                    }

                    if (_firmwareManager.SetCurrentFirmware(TID, releaseId))
                    {
                        return Ok();
                    }
                    else
                    {
                        return BadRequest($"Failed to set current firmware for device template {TID} to {releaseId}.");
                    }
                }
                else
                {
                    return NotFound($"Firmware release {releaseId} not found for device template {TID}.");
                }
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Get description of all firmware variants for a device template.
        /// </summary>
        /// <param name="TID">Template identifier.</param>
        /// <returns>Array of FirmwareVariant objects describing the template firmware variants.</returns>
        [HttpGet]
        [Route("api/templates/{TID}/firmware/variants")]
        [ProducesResponseType(typeof(FirmwareVariant[]), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult GetTemplateFirmwareVariants(string TID)
        {
            TemplatePermission dtp = _securityManager.GetTemplatePermissionForAccountAndTemplate(User.Identity.Name, TID);
            if (dtp != null && dtp.CanAdmin)
            {
                List<FirmwareVariant> variants = new List<FirmwareVariant>();
                variants.Add(new FirmwareVariant()
                {
                    Id = 0,
                    Name = "Default"
                });
                return Ok(variants.ToArray());
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Get description of all firmware releases for a device template.
        /// </summary>
        /// <param name="TID">Template identifier.</param>
        /// <returns>Array of FirmwareReleaseDescriptor objects describing the template firmware releases.</returns>
        [HttpGet]
        [Route("api/templates/{TID}/firmware")]
        [ProducesResponseType(typeof(FirmwareReleaseDescriptor[]), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        public IActionResult GetTemplateFirmwares(string TID)
        {
            return GetTemplateFirmwares(TID, null);
        }

        /// <summary>
        /// Get description of all firmware releases for a device template of a variant.
        /// </summary>
        /// <param name="TID">Template identifier.</param>
        /// <param name="variantId">Variant identifier.</param>
        /// <returns>Array of FirmwareReleaseDescriptor objects describing the template firmware releases.</returns>
        [HttpGet]
        [Route("api/templates/{TID}/firmware/{variantId}")]
        [ProducesResponseType(typeof(FirmwareReleaseDescriptor[]), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        public IActionResult GetTemplateFirmwares(string TID, int? variantId)
        {
            TemplatePermission dtp = _securityManager.GetTemplatePermissionForAccountAndTemplate(User.Identity.Name, TID);
            if (dtp != null && dtp.CanObserve)
            {
                FirmwareReleaseDescriptor[] frds = _firmwareManager.GetFirmwareReleases(TID);
                if (frds != null && frds.Length > 0)
                {
                    foreach (FirmwareReleaseDescriptor frd in frds)
                    {
                        frd.Url = _firmwareManager.GetFirmwareReleaseBlobUrl(HttpContext.Request.Host.Value, TID, frd);
                    }
                    return Ok(frds);
                }
                else
                {
                    return NoContent();
                }
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Get description of current firmware release for a device template.
        /// </summary>
        /// <param name="TID">Template identifier.</param>
        /// <returns>FirmwareReleaseDescriptor object describing the current template firmware release.</returns>
        [HttpGet]
        [Route("api/templates/{TID}/firmware/current")]
        [ProducesResponseType(typeof(FirmwareReleaseDescriptor), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        public IActionResult GetCurrentTemplateFirmware(string TID)
        {
            return GetCurrentTemplateFirmware(TID, null);
        }

        /// <summary>
        /// Get description of current firmware release for a device template.
        /// </summary>
        /// <param name="TID">Template identifier.</param>
        /// <param name="variantId">Template variant identifier.</param>
        /// <returns>FirmwareReleaseDescriptor object describing the current template firmware release.</returns>
        [HttpGet]
        [Route("api/templates/{TID}/firmware/{variantId}/current")]
        [ProducesResponseType(typeof(FirmwareReleaseDescriptor), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        public IActionResult GetCurrentTemplateFirmware(string TID, int? variantId)
        {
            TemplatePermission dtp = _securityManager.GetTemplatePermissionForAccountAndTemplate(User.Identity.Name, TID);
            if (dtp != null && dtp.CanObserve)
            {
                if (!variantId.HasValue || variantId == 0)
                {
                    FirmwareReleaseDescriptor frd = _firmwareManager.GetCurrentFirmwareRelease(TID);
                    if (frd != null)
                    {
                        frd.Url = _firmwareManager.GetFirmwareReleaseBlobUrl(HttpContext.Request.Host.Value, TID, frd);
                        return Ok(frd);
                    }
                    else
                    {
                        return NoContent();
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
        /// Get device template firmware release blob.
        /// </summary>
        /// <param name="TID">Template identifier.</param>
        /// <param name="releaseId">Firmware release identifier.</param>
        /// <param name="firmwareMD5">Firmware blob MD5 as received from Manifest (url encoded).</param>
        /// <returns>Byte array containing the full firmware blob.</returns>
        [HttpGet]
        [AllowAnonymous]
        [Route("api/templates/{TID}/firmware/{releaseId:int}/data/{firmwareMD5}")]
        [ProducesResponseType(typeof(byte[]), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult GetTemplateFirmwareReleaseBlob(string TID, int releaseId, string firmwareMD5)
        {
            string templateId = _firmwareManager.GetFirmwareReleaseTemplate(releaseId);
            FirmwareReleaseDescriptor frd = _firmwareManager.GetFirmwareRelease(releaseId);
            byte[] md5 = Base64UrlTextEncoder.Decode(firmwareMD5);

            // Release must belong to template and correct MD5 must have been specified.
            if (templateId != null && TID == templateId && frd != null && frd.FirmwareMD5 == Convert.ToBase64String(md5))
            {
                byte[] blob = _firmwareManager.GetFirmwareBlob(releaseId);
                if (blob != null)
                {
                    return File(blob, "application/octet-stream", true);
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

        /// <summary>
        /// Get device template firmware patch blob.
        /// </summary>
        /// <param name="TID">Template identifier.</param>
        /// <param name="encoding">Encoding type (supported: "hdiffpatch").</param>
        /// <param name="fromReleaseId">Firmware release identifier to upgrade from.</param>
        /// <param name="toReleaseId">Firmware release identifier to upgrade to.</param>
        /// <param name="firmwareMD5">Firmware blob MD5 as received from Manifest (url encoded).</param>
        /// <returns>Byte array containing the firmware patch blob.</returns>
        [HttpGet]
        [AllowAnonymous]
        [Route("api/templates/{TID}/firmware/{encoding}/{fromReleaseId:int}/{toReleaseId:int}/data/{firmwareMD5}")]
        [ProducesResponseType(typeof(byte[]), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult GetFirmwarePatchBlob(string TID, string encoding, int fromReleaseId, int toReleaseId, string firmwareMD5)
        {
            string fromFirmwareTemplateId = _firmwareManager.GetFirmwareReleaseTemplate(fromReleaseId);
            string toFirmwareTemplateId = _firmwareManager.GetFirmwareReleaseTemplate(toReleaseId);
            FirmwareReleaseDescriptor frd = _firmwareManager.GetFirmwareRelease(toReleaseId);
            byte[] md5 = Base64UrlTextEncoder.Decode(firmwareMD5);

            // Both from and to releases must belong to template and correct MD5 must be specified.
            if (TID == fromFirmwareTemplateId && TID == toFirmwareTemplateId && frd != null && frd.FirmwareMD5 == Convert.ToBase64String(md5))
            {
                byte[] blob = _firmwareManager.GetPatchBlob(fromReleaseId, toReleaseId, encoding);
                if (blob != null)
                {
                    return  File(blob, "application/octet-stream", true);
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
    }
}