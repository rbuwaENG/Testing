using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.Core.Security;
using Masterloop.Core.Types.Devices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Masterloop.Cloud.WebAPI.Controllers
{
    /// <summary>
    /// Template API.
    /// </summary>
    [Authorize]
    public class TemplateController : Controller
    {
        private readonly ITemplateManager _templateManager;
        private readonly ISecurityManager _securityManager;
        private readonly IDeviceManager _deviceManager;

        /// <summary>
        /// Constructor.
        /// </summary>
        public TemplateController(ITemplateManager templateManager, ISecurityManager securityManager, IDeviceManager deviceManager)
        {
            _templateManager = templateManager;
            _securityManager = securityManager;
            _deviceManager = deviceManager;
        }

        /// <summary>
        /// Gets all device templates for user.
        /// </summary>
        /// <returns>Array of DeviceTemplate objects.</returns>
        [HttpGet]
        [Route("api/templates")]
        [ProducesResponseType(typeof(DeviceTemplate[]), (int)HttpStatusCode.OK)]
        public IActionResult GetTemplates()
        {
            List<DeviceTemplate> templates = new List<DeviceTemplate>();
            TenantPermission[] tenantPermissions = _securityManager.GetTenantPermissionsForAccount(User.Identity.Name);
            foreach (TenantPermission tenantPermission in tenantPermissions)
            {
                if (tenantPermission.CanObserve)
                {
                    string[] tids = _templateManager.GetTemplateIDsByTenant(tenantPermission.TenantId);
                    if (tids != null)
                    {
                        foreach (string tid in tids)
                        {
                            DeviceTemplate t = _templateManager.GetTemplate(tid);
                            templates.Add(t);
                        }
                    }
                }
            }
            return Ok(templates);
        }

        /// <summary>
        /// Gets a specific device template.
        /// </summary>
        /// <returns>DeviceTemplate object.</returns>
        [HttpGet]
        [Route("api/templates/{TID}")]
        [ProducesResponseType(typeof(DeviceTemplate), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult GetTemplate(string TID)
        {
            int? templateTenantId = _templateManager.GetTemplateTenantId(TID);
            if (!templateTenantId.HasValue) return Unauthorized();
            TenantPermission[] tenantPermissions = _securityManager.GetTenantPermissionsForAccount(User.Identity.Name);
            if (tenantPermissions != null && tenantPermissions.Length > 0 &&
                tenantPermissions.Count(t => t.TenantId == templateTenantId) == 1 &&
                tenantPermissions.Single(t => t.TenantId == templateTenantId).CanObserve)
            {
                var result = _templateManager.GetTemplate(TID);
                return Ok(result);
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Gets devices for a specific device template. Metadata is always null for performance reasons.
        /// </summary>
        /// <param name="TID">Device template identifier.</param>
        /// <returns>DeviceTemplate object.</returns>
        [HttpGet]
        [Route("api/templates/{TID}/devices")]
        [ProducesResponseType(typeof(Device[]), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        public IActionResult GetTemplateDevices(string TID)
        {
            TenantPermission[] tenantPermissions = _securityManager.GetTenantPermissionsForAccount(User.Identity.Name);
            foreach (TenantPermission tenantPermission in tenantPermissions)
            {
                string[] tids = _templateManager.GetTemplateIDsByTenant(tenantPermission.TenantId);
                if (tids != null && tids.Length > 0 && tids.Contains(TID))
                {
                    if (tenantPermission.CanObserve)
                    {
                        var result = _deviceManager.GetDevicesByTemplate(TID, false, false);
                        return Ok(result);
                    }
                    else
                    {
                        return Unauthorized();
                    }
                }
            }
            return NotFound();
        }

        /// <summary>
        /// Creates a new device template belonging to a tenant.
        /// </summary>
        /// <param name="tenantId">Tenant identifier.</param>
        /// <param name="newTemplate">Device template details.</param>
        [HttpPost]
        [Route("api/tenants/{tenantId}/templates")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult CreateTemplate(int tenantId, [FromBody] DeviceTemplate newTemplate)
        {
            TenantPermission[] tenantPermissions = _securityManager.GetTenantPermissionsForAccount(User.Identity.Name);
            if (tenantPermissions != null && tenantPermissions.Length > 0 &&
                tenantPermissions.Count(t => t.TenantId == tenantId) == 1 &&
                tenantPermissions.Single(t => t.TenantId == tenantId).CanAdmin)
            {
                if (newTemplate != null && newTemplate.Id != null)  // Always validate template id in case user specified it manually.
                {
                    _deviceManager.ValidateMID(newTemplate.Id);

                    if (_templateManager.CreateTemplate(tenantId, newTemplate))
                    {
                        return Ok();
                    }
                }
                return BadRequest();
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Updates an existing device template.
        /// </summary>
        /// <param name="TID">Device template identifier to update.</param>
        /// <param name="template">Template details.</param>
        [HttpPut]
        [Route("api/templates/{TID}")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult UpdateTemplate(string TID, [FromBody] DeviceTemplate template)
        {
            TemplatePermission templatePermissions = _securityManager.GetTemplatePermissionForAccountAndTemplate(User.Identity.Name, TID);
            if (templatePermissions != null && templatePermissions.CanAdmin)
            {
                if (template != null && TID == template.Id)
                {
                    if (_templateManager.UpdateTemplate(template))
                    {
                        return Ok();
                    }
                    else
                    {
                        return BadRequest();
                    }
                }
                else
                {
                    return BadRequest();
                }
            }
            else
            {
                return Unauthorized();
            }
        }
    }
}