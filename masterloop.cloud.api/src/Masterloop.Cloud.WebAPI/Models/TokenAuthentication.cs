namespace Masterloop.Cloud.WebAPI.Models
{
    public class TokenAuthentication
    {
        public string SecretKey { get; set; }
        public string Issuer { get; set; }
        public string Audience { get; set; }
    }
}
