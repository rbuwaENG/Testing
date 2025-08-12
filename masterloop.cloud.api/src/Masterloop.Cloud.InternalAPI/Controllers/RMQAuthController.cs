using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.InternalAPI.Models.RabbitMqAuthBackendHttp.Requests;
using Masterloop.Cloud.InternalAPI.Models.RabbitMqAuthBackendHttp.Results;
using Microsoft.AspNetCore.Mvc;

namespace Masterloop.Cloud.InternalAPI.Controllers
{
    [Route("rmqauth")]
    [ApiController]
    public class RMQAuthController : Controller
    {
        private readonly ISecurityManager _securityManager;

        public RMQAuthController(ISecurityManager securityManager)
        {
            _securityManager = securityManager;
        }

        [Route("user")]
        [HttpPost]
        public IActionResult CheckUser([FromForm] UserAuthRequest request)
        {
            // If request.UserName is Device, call RMQAuthTemplateController.CheckUser(Device.TemplateId, request).
            return AuthResult.Deny();
        }

        [Route("vhost")]
        [HttpPost]
        public IActionResult CheckVhost([FromForm] VhostAuthRequest request)
        {
            return AuthResult.Deny();
        }

        [Route("resource")]
        [HttpPost]
        public IActionResult CheckResource([FromForm] ResourceAuthRequest request)
        {
            return AuthResult.Deny();
        }

        [Route("topic")]
        [HttpPost]
        public IActionResult CheckTopic([FromForm] TopicAuthRequest request)
        {
            return AuthResult.Deny();
        }
    }
}
