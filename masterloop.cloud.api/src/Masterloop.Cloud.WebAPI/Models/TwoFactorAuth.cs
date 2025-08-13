using System.ComponentModel.DataAnnotations;

namespace Masterloop.Cloud.WebAPI.Models
{
    public class TwoFactorAuthRequest
    {
        [Required]
        public string UserName { get; set; }
        
        [Required]
        public string Password { get; set; }
        
        [Required]
        public string TotpCode { get; set; }
    }

    public class TwoFactorAuthSetupRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }
    }

    public class TwoFactorAuthSetupResponse
    {
        public string SecretKey { get; set; }
        public string Message { get; set; }
    }

    public class TwoFactorAuthVerifyRequest
    {
        [Required]
        public string Email { get; set; }
        
        [Required]
        public string TotpCode { get; set; }
    }

    public class TwoFactorAuthVerifyResponse
    {
        public bool IsValid { get; set; }
        public string Message { get; set; }
    }

    public class EnableTwoFactorRequest
    {
        [Required]
        public string Email { get; set; }
        
        [Required]
        public string TotpCode { get; set; }
    }

    public class DisableTwoFactorRequest
    {
        [Required]
        public string Email { get; set; }
        
        [Required]
        public string TotpCode { get; set; }
    }

    // Admin-specific models
    public class AdminEnableTwoFactorRequest
    {
        [Required]
        public string UserEmail { get; set; }
    }

    public class AdminDisableTwoFactorRequest
    {
        [Required]
        public string UserEmail { get; set; }
    }

    public class UserTwoFactorStatus
    {
        public string Email { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public bool IsTwoFactorEnabled { get; set; }
        public bool IsAdmin { get; set; }
    }

    public class AdminTwoFactorManagementResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string SecretKey { get; set; }
    }
}