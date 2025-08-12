namespace Masterloop.Cloud.WebAPI.Models
{
    using System.Text.Json.Serialization;
    public class UserLogin
    {
        public string UserName { get; set; }
        [JsonIgnore]
        public string Password { get; set; }
        public string Grant_Type { get; set; }
    }
}
