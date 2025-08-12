using Microsoft.AspNetCore.Mvc;

namespace Masterloop.Cloud.InternalAPI.Models.RabbitMqAuthBackendHttp.Results
{
    public static class AuthResult
    {
        public static IActionResult Allow()
        {
            return new OkObjectResult("allow");
        }

        public static IActionResult Allow(params string[] tags)
        {
            return new OkObjectResult($"allow {string.Join(" ", tags)}");
        }

        public static IActionResult Deny()
        {
            return new OkObjectResult("deny");
        }
    }
}
