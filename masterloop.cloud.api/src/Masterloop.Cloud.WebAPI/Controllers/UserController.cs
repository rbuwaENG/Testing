using System.Net;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.Core.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Masterloop.Cloud.WebAPI.Controllers
{
    /// <summary>
    /// User API.
    /// </summary>
    [Authorize]
    public class UserController : Controller
    {
        private readonly ISecurityManager _securityManager;

        /// <summary>
        /// Constructor.
        /// </summary>
        public UserController(ISecurityManager securityManager)
        {
            _securityManager = securityManager;
        }

        /// <summary>
        /// Get all User type accounts.
        /// </summary>
        /// <returns>Array of Account objects.</returns>
        [HttpGet]
        [Route("api/users")]
        [ProducesResponseType(typeof(User[]), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult GetUsers()
        {
            Account account = _securityManager.GetAccount(User.Identity.Name);
            if (account != null && account.IsAdmin)
            {
                var result = _securityManager.GetUsers();
                return Ok(result);
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Get user information for logged in user.
        /// </summary>
        /// <returns>UserInformation object for logged in user.</returns>
        [HttpGet]
        [Route("api/users/self")]
        [ProducesResponseType(typeof(UserInformation), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult GetSelfUserInformation()
        {
            UserInformation userInformation = _securityManager.GetUserInformation(User.Identity.Name);
            if (userInformation != null)
            {
                return Ok(userInformation);
            }
            else
            {
                return NotFound();
            }
        }

        /// <summary>
        /// Create new user account.
        /// </summary>
        /// <returns>HTTP status code.</returns>
        [HttpPost]
        [Route("api/users")]
        [ProducesResponseType(typeof(string), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult CreateUser([FromBody] SecureUser user)
        {
            Account account = _securityManager.GetAccount(User.Identity.Name);
            if (account != null && account.IsAdmin)
            {
                string password = _securityManager.CreateUser(user);
                if (password != null)
                {
                    return Ok(password);
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

        /// <summary>
        /// Updates an existing user account.
        /// </summary>
        /// <param name="email">E-Mail address.</param>
        /// <param name="user">Modified user details.</param>
        /// <returns></returns>
        [HttpPut]
        [Route("api/users/{email}")]
        [ProducesResponseType(typeof(string), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult UpdateUser(string email, [FromBody] User user)
        {
            Account account = _securityManager.GetAccount(User.Identity.Name);
            if (account != null && account.IsAdmin)
            {
                if (email == user.EMail && _securityManager.UpdateUser(user))
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

        /// <summary>
        /// Delete an existing non-admin account.
        /// </summary>
        /// <param name="email">E-Mail address.</param>
        /// <returns>HTTP status code.</returns>
        [HttpDelete]
        [Route("api/users/{email}")]
        [ProducesResponseType(typeof(string), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult DeleteUser(string email)
        {
            Account account = _securityManager.GetAccount(User.Identity.Name);
            if (account != null && account.IsAdmin)
            {
                if (_securityManager.DeleteUser(email))
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
    }
}