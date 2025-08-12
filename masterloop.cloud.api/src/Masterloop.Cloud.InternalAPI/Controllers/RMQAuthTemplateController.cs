using Masterloop.Cloud.Core.RMQ;
using Masterloop.Cloud.InternalAPI.Models.RabbitMqAuthBackendHttp.Requests;
using Masterloop.Cloud.InternalAPI.Models.RabbitMqAuthBackendHttp.Results;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Devices;
using Microsoft.AspNetCore.Mvc;

namespace Masterloop.Cloud.InternalAPI.Controllers
{
    [Route("rmqauth/templates")]
    [ApiController]
    public class RMQAuthTemplateController : Controller
    {
        IDeviceRepository _deviceRepository;

        public RMQAuthTemplateController(IDeviceRepository deviceRepository)
        {
            _deviceRepository = deviceRepository;
        }

        [Route("{tid}/user")]
        [HttpPost]
        public IActionResult CheckUser(string tid, [FromForm] UserAuthRequest request)
        {
            SecureDetailedDevice details = _deviceRepository.Get(request.UserName);

            // Account must exist as a device, be of template tid, and have username and password set to match device.
            if (details != null &&
                details.MID == request.UserName &&
                details.TemplateId == tid &&
                details.PreSharedKey == request.Password)
            {
                return AuthResult.Allow();
            }
            else
            {
                return AuthResult.Deny();
            }
        }

        [Route("{tid}/vhost")]
        [HttpPost]
        public IActionResult CheckVhost(string tid, [FromForm] VhostAuthRequest request)
        {
            SecureDetailedDevice details = _deviceRepository.Get(request.UserName);

            // Account must exist as a device, be of template tid, and have username and password set to match device.
            if (details != null &&
                details.MID == request.UserName &&
                details.TemplateId == tid &&
                request.Vhost == "/")
            {
                return AuthResult.Allow();
            }
            else
            {
                return AuthResult.Deny();
            }
        }

        [Route("{tid}/resource")]
        [HttpPost]
        public IActionResult CheckResource(string tid, [FromForm] ResourceAuthRequest request)
        {
            SecureDetailedDevice details = _deviceRepository.Get(request.UserName);

            if (details != null &&
                details.MID == request.UserName &&
                details.TemplateId == tid &&
                request.Vhost == "/")
            {
                if (request.Resource == Resource.Exchange)
                {
                    if (request.Permission == ResourcePermission.Configure)
                    {
                        if (request.Name == RMQNameProvider.GetMqttExchangeName())
                        {
                            return AuthResult.Allow();
                        }
                    }
                    else if (request.Permission == ResourcePermission.Write)
                    {
                        if (request.Name == RMQNameProvider.GetMqttExchangeName() || request.Name == RMQNameProvider.CreateDeviceExchangeName(details.MID))
                        {
                            return AuthResult.Allow();
                        }
                    }
                    else if (request.Permission == ResourcePermission.Read)
                    {
                        if (request.Name == RMQNameProvider.GetMqttExchangeName())
                        {
                            return AuthResult.Allow();
                        }
                    }
                }
                else if (request.Resource == Resource.Queue)
                {
                    if (request.Permission == ResourcePermission.Configure)
                    {
                        if (request.Name == RMQNameProvider.CreateDeviceMQTTQueueName(details.MID))
                        {
                            return AuthResult.Allow();
                        }
                    }
                    else if (request.Permission == ResourcePermission.Write)
                    {
                        if (request.Name == RMQNameProvider.CreateDeviceMQTTQueueName(details.MID))
                        {
                            return AuthResult.Allow();
                        }
                    }
                    else if (request.Permission == ResourcePermission.Read)
                    {
                        if (request.Name == RMQNameProvider.CreateDeviceMQTTQueueName(details.MID) || request.Name == RMQNameProvider.CreateDeviceAMQPQueueName(details.MID))
                        {
                            return AuthResult.Allow();
                        }
                    }
                }
            }

            return AuthResult.Deny();
        }

        [Route("{tid}/topic")]
        [HttpPost]
        public IActionResult CheckTopic(string tid, [FromForm] TopicAuthRequest request)
        {
            SecureDetailedDevice details = _deviceRepository.Get(request.UserName);

            if (details != null &&
                details.MID == request.UserName &&
                details.TemplateId == tid)
            {
                if (request.Vhost == "/" && request.Resource == Resource.Topic && request.Name == RMQNameProvider.GetMqttExchangeName())
                {
                    if (request.Permission == TopicPermission.Read)
                    {
                        if (request.RoutingKey.StartsWith($"{details.MID}.") || request.RoutingKey == "P")
                        {
                            return AuthResult.Allow();
                        }
                    }
                    else if (request.Permission == TopicPermission.Write)
                    {
                        if (request.RoutingKey.StartsWith($"{details.MID}."))
                        {
                            return AuthResult.Allow();
                        }
                    }
                }
            }

            return AuthResult.Deny();
        }
    }
}
