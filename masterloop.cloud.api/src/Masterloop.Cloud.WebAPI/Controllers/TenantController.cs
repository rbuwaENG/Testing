using System.Collections.Generic;
using System.Linq;
using System.Net;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.Core.Security;
using Masterloop.Cloud.Core.Tenant;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Masterloop.Cloud.WebAPI.Controllers
{
    /// <summary>
    /// Tenant API.
    /// </summary>
    [Authorize]
    public class TenantController : Controller
    {
        private readonly ITenantManager _tenantManager;
        private readonly ISecurityManager _securityManager;
        private readonly ITemplateManager _templateManager;

        /// <summary>
        /// Constructor.
        /// </summary>
        public TenantController(ITenantManager tenantManager, ISecurityManager securityManager, ITemplateManager templateManager)
        {
            _tenantManager = tenantManager;
            _securityManager = securityManager;
            _templateManager = templateManager;
        }

        [HttpGet]
        [Route("api/tenants")]
        [ProducesResponseType(typeof(Tenant[]), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        public IActionResult GetTenants()
        {
            Tenant[] allTenants = _tenantManager.GetTenants();
            Account account = _securityManager.GetAccount(User.Identity.Name);
            if (account != null)
            {
                if (account.IsAdmin)
                {
                    return Ok(allTenants);
                }
                else
                {
                    List<Tenant> tenants = new List<Tenant>();
                    TenantPermission[] tenantPermissions = _securityManager.GetTenantPermissionsForAccount(User.Identity.Name);
                    if (tenantPermissions != null)
                    {
                        foreach (TenantPermission tenantPermission in tenantPermissions)
                        {
                            if (tenantPermission.CanObserve || tenantPermission.CanControl || tenantPermission.CanAdmin)
                            {
                                tenants.Add(allTenants.Single(t => t.Id == tenantPermission.TenantId));
                            }
                        }
                        return Ok(tenants);
                    }
                    else
                    {
                        return NotFound();
                    }
                }
            }
            else
            {
                return Unauthorized();
            }
        }

        [HttpPost]
        [Route("api/tenants")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult CreateTenant([FromBody]string name)
        {
            Account account = _securityManager.GetAccount(User.Identity.Name);
            if (account != null && account.IsAdmin)
            {
                _tenantManager.CreateTenant(name);
                return Ok();
            }
            else
            {
                return Unauthorized();
            }
        }

        [HttpGet]
        [Route("api/tenants/{tenantId}/users")]
        [ProducesResponseType(typeof(TenantPermission[]), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        public IActionResult GetTenantUsers(int tenantId)
        {
            Account account = _securityManager.GetAccount(User.Identity.Name);
            if (account != null && account.IsAdmin)
            {
                TenantPermission[] permissions = _tenantManager.GetTenantUsers(tenantId);
                if (permissions != null)
                {
                    return Ok(permissions);
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

        [HttpPost]
        [Route("api/tenants/{tenantId}/users")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        public IActionResult CreateTenantUser(int tenantId, [FromBody] TenantPermission permission)
        {
            Account account = _securityManager.GetAccount(User.Identity.Name);
            if (account != null && account.IsAdmin)
            {
                if (tenantId == permission.TenantId)
                {
                    if (_tenantManager.SetTenantPermission(permission))
                    {
                        return Ok();
                    }
                    else
                    {
                        return NotFound();
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

        [HttpDelete]
        [Route("api/tenants/{tenantId}/users/{email}")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        public IActionResult DeleteTenantUser(int tenantId, string email)
        {
            Account account = _securityManager.GetAccount(User.Identity.Name);
            if (account != null && account.IsAdmin)
            {
                if (_tenantManager.RemoveTenantPermission(tenantId, email))
                {
                    return Ok();
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