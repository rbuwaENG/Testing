using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.WebAPI.Models;
using Masterloop.Cloud.WebAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using Masterloop.Cloud.WebAPI.Templates;

namespace Masterloop.Cloud.WebAPI.Controllers
{
    [ApiController]
    [Route("api/account")]
    public class AccountController : ControllerBase
    {
        private readonly ISecurityManager _securityManager;
        private readonly IEmailService _emailService;
        private readonly ForgotPasswordTemplates _emailTemplates;

        public AccountController(ISecurityManager securityManager, IEmailService emailService, ForgotPasswordTemplates emailTemplates)
        {
            _securityManager = securityManager;
            _emailService = emailService;
            _emailTemplates = emailTemplates;
        }

        [AllowAnonymous]
        [HttpPost("forgot-password")]
        public IActionResult ForgotPassword([FromBody] ForgotPasswordRequest rqstData)
        {
            if (rqstData == null || string.IsNullOrWhiteSpace(rqstData.Email) || string.IsNullOrWhiteSpace(rqstData.ResetURL))
            {
                return BadRequest(new { Message = "Email is required." });
            }

            try
            {
                var account = _securityManager.GetAccount(rqstData.Email);
                if (account == null)
                {
                    return Ok(new { Message = "Email does not exist in the system" });
                }

                // Generate a secure token, e.g. GUID + store hashed with expiration, 
                var token = _securityManager.GeneratePasswordResetToken(rqstData.Email);

                var emailBody = _emailTemplates.GetForgotPasswordEmailTemplate_English(rqstData,token);

                // Send reset email
                _emailService.SendEmailAsync(rqstData.Email, "Forgot Password Recovery", emailBody);

                return Ok(new { Message = "Reset link sent to your email." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "An unexpected error occurred. Please try again later." });
            }
        }

        [AllowAnonymous]
        [HttpPost("reset-password")]
        public IActionResult ResetPassword([FromBody] ResetPasswordRequest rqstdata)
        {
            if (rqstdata == null
                || string.IsNullOrWhiteSpace(rqstdata.Email)
                || string.IsNullOrWhiteSpace(rqstdata.Token)
                || string.IsNullOrWhiteSpace(rqstdata.NewPassword))
            {
                return BadRequest(new { Message = "Email, token and new password are required." });
            }

            try
            {
                // Validate token, check expiration and reset password
                bool resetSuccess = _securityManager.ResetPassword(rqstdata.Email, rqstdata.Token, rqstdata.NewPassword);

                if (resetSuccess)
                {
                    return Ok(new { Message = "Password reset successfully." });
                }
                else
                {
                    return BadRequest(new { Message = "Invalid token or reset failed." });
                }
            }
            catch (Exception ex)
            {
                // Ideally log ex here with a logging framework
                return StatusCode(500, new { Message = "An unexpected error occurred. Please try again later." });
            }
        }
    }
}
