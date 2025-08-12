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
        public string QrCodeUrl { get; set; }
        public string ManualEntryKey { get; set; }
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
}