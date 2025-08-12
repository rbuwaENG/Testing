using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Masterloop.Cloud.WebAPI.Models;
using Masterloop.Cloud.WebAPI.Services;
using System;
using System.Threading.Tasks;

namespace Masterloop.Cloud.WebAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TwoFactorAuthController : ControllerBase
    {
        private readonly ITwoFactorAuthService _twoFactorAuthService;
        private readonly ISecurityService _securityService;

        public TwoFactorAuthController(
            ITwoFactorAuthService twoFactorAuthService,
            ISecurityService securityService)
        {
            _twoFactorAuthService = twoFactorAuthService;
            _securityService = securityService;
        }

        /// <summary>
        /// Setup two-factor authentication for a user
        /// </summary>
        /// <param name="request">Setup request containing user email</param>
        /// <returns>Setup response with secret key and QR code URL</returns>
        [HttpPost("setup")]
        [AllowAnonymous]
        public async Task<ActionResult<TwoFactorAuthSetupResponse>> SetupTwoFactor([FromBody] TwoFactorAuthSetupRequest request)
        {
            try
            {
                var response = await _twoFactorAuthService.SetupTwoFactorAsync(request.Email);
                return Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, new { error = "An error occurred while setting up two-factor authentication" });
            }
        }

        /// <summary>
        /// Verify a TOTP code for two-factor authentication
        /// </summary>
        /// <param name="request">Verification request containing email and TOTP code</param>
        /// <returns>Verification result</returns>
        [HttpPost("verify")]
        [AllowAnonymous]
        public async Task<ActionResult<TwoFactorAuthVerifyResponse>> VerifyTwoFactor([FromBody] TwoFactorAuthVerifyRequest request)
        {
            try
            {
                var isValid = await _twoFactorAuthService.VerifyTwoFactorAsync(request.Email, request.TotpCode);
                
                return Ok(new TwoFactorAuthVerifyResponse
                {
                    IsValid = isValid,
                    Message = isValid ? "TOTP code is valid" : "Invalid TOTP code"
                });
            }
            catch (Exception)
            {
                return StatusCode(500, new { error = "An error occurred while verifying the TOTP code" });
            }
        }

        /// <summary>
        /// Enable two-factor authentication for a user
        /// </summary>
        /// <param name="request">Enable request containing email and TOTP code</param>
        /// <returns>Success result</returns>
        [HttpPost("enable")]
        [AllowAnonymous]
        public async Task<ActionResult> EnableTwoFactor([FromBody] EnableTwoFactorRequest request)
        {
            try
            {
                var success = await _twoFactorAuthService.EnableTwoFactorAsync(request.Email, request.TotpCode);
                
                if (success)
                {
                    return Ok(new { message = "Two-factor authentication enabled successfully" });
                }
                else
                {
                    return BadRequest(new { error = "Invalid TOTP code or user not found" });
                }
            }
            catch (Exception)
            {
                return StatusCode(500, new { error = "An error occurred while enabling two-factor authentication" });
            }
        }

        /// <summary>
        /// Disable two-factor authentication for a user
        /// </summary>
        /// <param name="request">Disable request containing email and TOTP code</param>
        /// <returns>Success result</returns>
        [HttpPost("disable")]
        [AllowAnonymous]
        public async Task<ActionResult> DisableTwoFactor([FromBody] DisableTwoFactorRequest request)
        {
            try
            {
                var success = await _twoFactorAuthService.DisableTwoFactorAsync(request.Email, request.TotpCode);
                
                if (success)
                {
                    return Ok(new { message = "Two-factor authentication disabled successfully" });
                }
                else
                {
                    return BadRequest(new { error = "Invalid TOTP code or user not found" });
                }
            }
            catch (Exception)
            {
                return StatusCode(500, new { error = "An error occurred while disabling two-factor authentication" });
            }
        }

        /// <summary>
        /// Check if two-factor authentication is enabled for a user
        /// </summary>
        /// <param name="email">User email</param>
        /// <returns>Enabled status</returns>
        [HttpGet("status/{email}")]
        [AllowAnonymous]
        public async Task<ActionResult> GetTwoFactorStatus(string email)
        {
            try
            {
                var isEnabled = await _twoFactorAuthService.IsTwoFactorEnabledAsync(email);
                return Ok(new { email, isEnabled });
            }
            catch (Exception)
            {
                return StatusCode(500, new { error = "An error occurred while checking two-factor authentication status" });
            }
        }

        /// <summary>
        /// Send a TOTP code via email for two-factor authentication
        /// </summary>
        /// <param name="email">User email</param>
        /// <returns>Success result</returns>
        [HttpPost("send-code/{email}")]
        [AllowAnonymous]
        public async Task<ActionResult> SendTwoFactorCode(string email)
        {
            try
            {
                var success = await _twoFactorAuthService.SendTwoFactorCodeEmailAsync(email);
                
                if (success)
                {
                    return Ok(new { message = "Two-factor authentication code sent successfully" });
                }
                else
                {
                    return BadRequest(new { error = "Failed to send two-factor authentication code" });
                }
            }
            catch (Exception)
            {
                return StatusCode(500, new { error = "An error occurred while sending the two-factor authentication code" });
            }
        }

        /// <summary>
        /// Authenticate with username, password, and TOTP code
        /// </summary>
        /// <param name="request">Authentication request</param>
        /// <returns>Authentication result with JWT token</returns>
        [HttpPost("authenticate")]
        [AllowAnonymous]
        public async Task<ActionResult> AuthenticateWithTwoFactor([FromBody] TwoFactorAuthRequest request)
        {
            try
            {
                // First, verify the TOTP code
                var totpValid = await _twoFactorAuthService.VerifyTwoFactorAsync(request.UserName, request.TotpCode);
                if (!totpValid)
                {
                    return BadRequest(new { error = "Invalid TOTP code" });
                }

                // Then authenticate with username and password
                var login = new UserLogin
                {
                    UserName = request.UserName,
                    Password = request.Password
                };

                var result = _securityService.GetToken(login);
                if (result == null)
                {
                    return BadRequest(new { error = "Invalid username or password" });
                }

                return Ok(result);
            }
            catch (Exception)
            {
                return StatusCode(500, new { error = "An error occurred during authentication" });
            }
        }
    }
}