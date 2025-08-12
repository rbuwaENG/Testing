using Masterloop.Cloud.WebAPI.Models;
using Masterloop.Cloud.WebAPI.Services;
using Microsoft.AspNetCore.Mvc;

namespace Masterloop.Cloud.WebAPI.Controllers
{
    [Route("")]
    [ApiController]
    public class LegacyController : ControllerBase
    {
        private readonly ISecurityService _securityService;

        public LegacyController(ISecurityService securityService)
        {
            _securityService = securityService;
        }

        [HttpPost("Token")]
        public IActionResult GetToken([FromForm]UserLogin login)
        {
            UserLoginResult result = _securityService.GetToken(login);
            if (result != null)
            {
                return Ok(result);
            }
            else
            {
                return Unauthorized();
            }
        }
    }
}