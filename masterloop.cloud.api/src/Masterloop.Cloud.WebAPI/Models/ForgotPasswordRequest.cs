namespace Masterloop.Cloud.WebAPI.Models
{
    public class ForgotPasswordRequest
    {
        public string Email { get; set; }
        public string ResetURL { get; set; }
    }
}
