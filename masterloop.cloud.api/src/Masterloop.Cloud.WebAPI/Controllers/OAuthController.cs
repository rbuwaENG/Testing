using System;
using System.Linq;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.Core.Security;
using Masterloop.Cloud.WebAPI.Models;
using Masterloop.Cloud.WebAPI.Services;
using Microsoft.AspNetCore.Mvc;

namespace Masterloop.Cloud.WebAPI.Controllers
{
    [ApiController]
    [Route("oauth")] // /oauth/authorize, /oauth/token
    public class OAuthController : ControllerBase
    {
        private readonly ISecurityManager _securityManager;
        private readonly ISecurityService _securityService;
        private readonly IAuthorizationCodeStore _codeStore;

        public OAuthController(
            ISecurityManager securityManager,
            ISecurityService securityService,
            IAuthorizationCodeStore codeStore)
        {
            _securityManager = securityManager;
            _securityService = securityService;
            _codeStore = codeStore;
        }

        [HttpPost("authorize")]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        [ProducesResponseType(typeof(AuthorizeResponse), (int)HttpStatusCode.OK)]
        public IActionResult Authorize([FromBody] AuthorizeRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { error = "invalid_request" });
            }

            if (!string.Equals(request.response_type, "code", StringComparison.Ordinal))
            {
                return BadRequest(new { error = "unsupported_response_type" });
            }

            if (string.IsNullOrWhiteSpace(request.client_id) ||
                string.IsNullOrWhiteSpace(request.code_challenge) ||
                !string.Equals(request.code_challenge_method, "S256", StringComparison.Ordinal))
            {
                return BadRequest(new { error = "invalid_request" });
            }

            // Authenticate resource owner with username/password
            var account = _securityManager.Authenticate(request.username, request.password);
            if (account == null)
            {
                return Unauthorized();
            }

            // Create authorization code
            var authCode = new AuthorizationCode
            {
                Code = GenerateAuthorizationCode(),
                ClientId = request.client_id,
                RedirectUri = request.redirect_uri,
                Subject = account.AccountId,
                CodeChallenge = request.code_challenge,
                CodeChallengeMethod = request.code_challenge_method,
                Scope = request.scope,
                ExpiresAtUtc = DateTime.UtcNow.AddMinutes(5)
            };

            _codeStore.Store(authCode);

            return Ok(new AuthorizeResponse
            {
                code = authCode.Code,
                state = request.state
            });
        }

        [HttpPost("token")]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        [ProducesResponseType(typeof(UserLoginResult), (int)HttpStatusCode.OK)]
        public IActionResult Token([FromBody] TokenRequest request)
        {
            if (request == null || !string.Equals(request.grant_type, "authorization_code", StringComparison.Ordinal))
            {
                return BadRequest(new { error = "unsupported_grant_type" });
            }

            var stored = _codeStore.Find(request.code);
            if (stored == null || stored.IsConsumed || stored.ExpiresAtUtc < DateTime.UtcNow)
            {
                return BadRequest(new { error = "invalid_grant" });
            }

            if (!string.Equals(stored.ClientId, request.client_id, StringComparison.Ordinal))
            {
                return BadRequest(new { error = "invalid_client" });
            }

            if (!string.IsNullOrEmpty(stored.RedirectUri) && !string.Equals(stored.RedirectUri, request.redirect_uri, StringComparison.Ordinal))
            {
                return BadRequest(new { error = "invalid_request" });
            }

            if (!string.Equals(stored.CodeChallengeMethod, "S256", StringComparison.Ordinal))
            {
                return BadRequest(new { error = "invalid_request" });
            }

            // Validate PKCE
            var computedChallenge = ComputeCodeChallenge(request.code_verifier);
            if (!string.Equals(computedChallenge, stored.CodeChallenge, StringComparison.Ordinal))
            {
                return BadRequest(new { error = "invalid_grant" });
            }

            // Consume code to prevent reuse
            _codeStore.Consume(stored.Code);

            // Issue access token (no password is ever put into token)
            var account = new Account { AccountId = stored.Subject };
            var tokenResult = _securityService.GenerateToken(account);

            return Ok(tokenResult);
        }

        private static string GenerateAuthorizationCode()
        {
            var bytes = new byte[32];
            RandomNumberGenerator.Fill(bytes);
            return Base64UrlEncode(bytes);
        }

        private static string ComputeCodeChallenge(string codeVerifier)
        {
            if (string.IsNullOrWhiteSpace(codeVerifier) || codeVerifier.Length < 43 || codeVerifier.Length > 128)
            {
                return null;
            }
            using var sha256 = SHA256.Create();
            var hash = sha256.ComputeHash(Encoding.ASCII.GetBytes(codeVerifier));
            return Base64UrlEncode(hash);
        }

        private static string Base64UrlEncode(byte[] input)
        {
            var output = Convert.ToBase64String(input)
                .TrimEnd('=')
                .Replace('+', '-')
                .Replace('/', '_');
            return output;
        }
    }

    public class AuthorizeRequest
    {
        public string response_type { get; set; } // should be "code"
        public string client_id { get; set; }
        public string redirect_uri { get; set; }
        public string scope { get; set; }
        public string state { get; set; }
        public string code_challenge { get; set; }
        public string code_challenge_method { get; set; } // must be S256
        public string username { get; set; }
        public string password { get; set; }
    }

    public class AuthorizeResponse
    {
        public string code { get; set; }
        public string state { get; set; }
    }

    public class TokenRequest
    {
        public string grant_type { get; set; } // authorization_code
        public string code { get; set; }
        public string redirect_uri { get; set; }
        public string client_id { get; set; }
        public string code_verifier { get; set; }
    }
}