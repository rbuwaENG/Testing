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

        /// <summary>
        /// Get two-factor authentication status for all users (for user list display)
        /// </summary>
        /// <returns>List of user 2FA statuses</returns>
        [HttpGet("users-status")]
        [AllowAnonymous]
        public async Task<ActionResult> GetUsersTwoFactorStatus()
        {
            try
            {
                var users = _twoFactorAuthService.GetAllUsersTwoFactorStatusAsync("", "");
                var userStatuses = await users;
                return Ok(userStatuses);
            }
            catch (Exception)
            {
                return StatusCode(500, new { error = "An error occurred while retrieving user statuses" });
            }
        }

        // Admin endpoints
        /// <summary>
        /// Admin endpoint to enable two-factor authentication for a specific user
        /// </summary>
        /// <param name="request">Admin request containing user email</param>
        /// <returns>Admin management response</returns>
        [HttpPost("admin/enable")]
        [Authorize] // Require authentication
        public async Task<ActionResult<AdminTwoFactorManagementResponse>> AdminEnableTwoFactor([FromBody] AdminEnableTwoFactorRequest request)
        {
            try
            {
                // Get current user from JWT token
                var currentUserEmail = User.Identity.Name;
                if (string.IsNullOrEmpty(currentUserEmail))
                {
                    return Unauthorized(new { error = "User not authenticated" });
                }

                // Prevent users from managing their own 2FA
                if (currentUserEmail.Equals(request.UserEmail, StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest(new { error = "Users cannot manage their own two-factor authentication" });
                }

                // Verify current user is admin
                if (!await _twoFactorAuthService.IsUserAdminAsync(currentUserEmail, ""))
                {
                    return Forbid();
                }

                var response = await _twoFactorAuthService.AdminEnableTwoFactorAsync(
                    request.UserEmail, 
                    currentUserEmail, 
                    ""); // No password needed since we're using JWT

                if (response.Success)
                {
                    return Ok(response);
                }
                else
                {
                    return BadRequest(response);
                }
            }
            catch (Exception)
            {
                return StatusCode(500, new { error = "An error occurred while enabling two-factor authentication" });
            }
        }

        /// <summary>
        /// Admin endpoint to disable two-factor authentication for a specific user
        /// </summary>
        /// <param name="request">Admin request containing user email</param>
        /// <returns>Admin management response</returns>
        [HttpPost("admin/disable")]
        [Authorize] // Require authentication
        public async Task<ActionResult<AdminTwoFactorManagementResponse>> AdminDisableTwoFactor([FromBody] AdminDisableTwoFactorRequest request)
        {
            try
            {
                // Get current user from JWT token
                var currentUserEmail = User.Identity.Name;
                if (string.IsNullOrEmpty(currentUserEmail))
                {
                    return Unauthorized(new { error = "User not authenticated" });
                }

                // Prevent users from managing their own 2FA
                if (currentUserEmail.Equals(request.UserEmail, StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest(new { error = "Users cannot manage their own two-factor authentication" });
                }

                // Verify current user is admin
                if (!await _twoFactorAuthService.IsUserAdminAsync(currentUserEmail, ""))
                {
                    return Forbid();
                }

                var response = await _twoFactorAuthService.AdminDisableTwoFactorAsync(
                    request.UserEmail, 
                    currentUserEmail, 
                    ""); // No password needed since we're using JWT

                if (response.Success)
                {
                    return Ok(response);
                }
                else
                {
                    return BadRequest(response);
                }
            }
            catch (Exception)
            {
                return StatusCode(500, new { error = "An error occurred while disabling two-factor authentication" });
            }
        }

        /// <summary>
        /// Admin endpoint to get all users' two-factor authentication status
        /// </summary>
        /// <param name="adminEmail">Admin email</param>
        /// <param name="adminPassword">Admin password</param>
        /// <returns>List of user 2FA statuses</returns>
        [HttpGet("admin/users-status")]
        [AllowAnonymous]
        public async Task<ActionResult> GetAllUsersTwoFactorStatus([FromQuery] string adminEmail, [FromQuery] string adminPassword)
        {
            try
            {
                if (string.IsNullOrEmpty(adminEmail) || string.IsNullOrEmpty(adminPassword))
                {
                    return BadRequest(new { error = "Admin email and password are required" });
                }

                var userStatuses = await _twoFactorAuthService.GetAllUsersTwoFactorStatusAsync(adminEmail, adminPassword);
                return Ok(userStatuses);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { error = "Access denied. Admin credentials required." });
            }
            catch (Exception)
            {
                return StatusCode(500, new { error = "An error occurred while retrieving user statuses" });
            }
        }

        /// <summary>
        /// Admin endpoint to check if a user is an admin
        /// </summary>
        /// <param name="email">User email</param>
        /// <param name="password">User password</param>
        /// <returns>Admin status</returns>
        [HttpGet("admin/check-admin")]
        [AllowAnonymous]
        public async Task<ActionResult> CheckAdminStatus([FromQuery] string email, [FromQuery] string password)
        {
            try
            {
                if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
                {
                    return BadRequest(new { error = "Email and password are required" });
                }

                var isAdmin = await _twoFactorAuthService.IsUserAdminAsync(email, password);
                return Ok(new { email, isAdmin });
            }
            catch (Exception)
            {
                return StatusCode(500, new { error = "An error occurred while checking admin status" });
            }
        }
    }
}