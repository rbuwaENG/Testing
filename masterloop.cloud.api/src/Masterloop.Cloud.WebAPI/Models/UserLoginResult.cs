namespace Masterloop.Cloud.WebAPI.Models
{
    public class UserLoginResult
    {
        public string access_token { get; set; }
        public string token_type { get; set; }
        public int expires_in { get; set; }
    }
}
