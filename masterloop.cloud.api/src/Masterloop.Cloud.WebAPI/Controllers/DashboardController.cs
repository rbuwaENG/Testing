using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.Core.Dashboard;
using Masterloop.Cloud.Core.Security;
using Masterloop.Cloud.Core.Tenant;
using Masterloop.Core.Types.Devices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Masterloop.Cloud.WebAPI.Controllers
{
    /// <summary>
    /// Dashboard API.
    /// </summary>
    [Authorize]
    public class DashboardController : Controller
    {
        private readonly ITemplateManager _templateManager;
        private readonly ISecurityManager _securityManager;
        private readonly IDashboardManager _dashboardManager;
        private readonly ITenantManager _tenantManager;

        /// <summary>
        /// Constructor.
        /// </summary>
        public DashboardController(ITemplateManager templateManager, ISecurityManager securityManager, IDashboardManager dashboardManager, ITenantManager tenantManager)
        {
            _templateManager = templateManager;
            _securityManager = securityManager;
            _dashboardManager = dashboardManager;
            _tenantManager = tenantManager;
        }

        /// <summary>
        /// Gets all dashboards belonging to one specific device template.
        /// </summary>
        /// <param name="TID">Device template identifier.</param>
        /// <returns>Array of TemplateDashboard objects.</returns>
        [HttpGet]
        [Route("api/templates/{TID}/dashboards")]
        [ProducesResponseType(typeof(TemplateDashboard[]), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.NoContent)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult GetTemplateDashboards(string TID)
        {
            int? tenantId = _templateManager.GetTemplateTenantId(TID);
            if (tenantId.HasValue && _tenantManager.HasFeature(tenantId.Value, AddOnFeature.Dashboard))
            {
                TemplatePermission templatePermissions = _securityManager.GetTemplatePermissionForAccountAndTemplate(User.Identity.Name, TID);
                if (templatePermissions.CanObserve)
                {
                    TemplateDashboard[] dashboards = _dashboardManager.GetTemplateDashboards(TID);
                    if (dashboards != null && dashboards.Length > 0)
                    {
                        return Ok(dashboards);
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
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Gets a specific device template dashboard.
        /// </summary>
        /// <param name="TID">Device template identifier.</param>
        /// <param name="DID">Dashboard identifier.</param>
        /// <returns>TemplateDashboard object.</returns>
        [HttpGet]
        [Route("api/templates/{TID}/dashboards/{DID}")]
        [ProducesResponseType(typeof(TemplateDashboard), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult GetTemplateDashboard(string TID, string DID)
        {
            int? tenantId = _templateManager.GetTemplateTenantId(TID);
            if (tenantId.HasValue && _tenantManager.HasFeature(tenantId.Value, AddOnFeature.Dashboard))
            {
                TemplatePermission templatePermissions = _securityManager.GetTemplatePermissionForAccountAndTemplate(User.Identity.Name, TID);
                if (templatePermissions.CanObserve)
                {
                    TemplateDashboard dashboard = _dashboardManager.GetTemplateDashboard(TID, DID);
                    if (dashboard != null)
                    {
                        return Ok(dashboard);
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
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Creates a new dashboard belonging to one specific device template.
        /// </summary>
        /// <param name="TID">Device template identifier.</param>
        /// <param name="dashboard">Template dashboard details.</param>
        [HttpPost]
        [Route("api/templates/{TID}/dashboards")]
        [ProducesResponseType(typeof(string), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult CreateTemplateDashboard(string TID, [FromBody] TemplateDashboard dashboard)
        {
            int? tenantId = _templateManager.GetTemplateTenantId(TID);
            if (tenantId.HasValue && _tenantManager.HasFeature(tenantId.Value, AddOnFeature.Dashboard))
            {
                TemplatePermission templatePermissions = _securityManager.GetTemplatePermissionForAccountAndTemplate(User.Identity.Name, TID);
                if (templatePermissions.CanAdmin)
                {
                    if (dashboard != null)  // Always validate template id in case user specified it manually.
                    {
                        string did = _dashboardManager.CreateTemplateDashboard(TID, dashboard);
                        if (!string.IsNullOrEmpty(did))
                        {
                            return Ok(did);
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
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Updates an existing dashboard belonging to one specific device template.
        /// </summary>
        /// <param name="TID">Device template identifier.</param>
        /// <param name="DID">Dashboard identifier.</param>
        /// <param name="dashboard">Template dashboard details.</param>
        [HttpPut]
        [Route("api/templates/{TID}/dashboards/{DID}")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult UpdateTemplateDashboard(string TID, string DID, [FromBody] TemplateDashboard dashboard)
        {
            int? tenantId = _templateManager.GetTemplateTenantId(TID);
            if (tenantId.HasValue && _tenantManager.HasFeature(tenantId.Value, AddOnFeature.Dashboard))
            {
                TemplatePermission templatePermissions = _securityManager.GetTemplatePermissionForAccountAndTemplate(User.Identity.Name, TID);
                if (templatePermissions.CanAdmin && dashboard.Id == DID)
                {
                    if (dashboard != null)  // Always validate template id in case user specified it manually.
                    {
                        if (_dashboardManager.UpdateTemplateDashboard(TID, dashboard))
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
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Deletes an existing dashboard belonging to one specific device template.
        /// </summary>
        /// <param name="TID">Device template identifier.</param>
        /// <param name="DID">Dashboard identifier.</param>
        [HttpDelete]
        [Route("api/templates/{TID}/dashboards/{DID}")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult DeleteTemplateDashboard(string TID, string DID)
        {
            int? tenantId = _templateManager.GetTemplateTenantId(TID);
            if (tenantId.HasValue && _tenantManager.HasFeature(tenantId.Value, AddOnFeature.Dashboard))
            {
                TemplatePermission templatePermissions = _securityManager.GetTemplatePermissionForAccountAndTemplate(User.Identity.Name, TID);
                if (templatePermissions.CanAdmin)
                {
                    if (_dashboardManager.DeleteTemplateDashboard(TID, DID))
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
                    return Unauthorized();
                }
            }
            else
            {
                return Unauthorized();
            }
        }
    }
}