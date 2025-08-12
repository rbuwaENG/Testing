using System;
using System.Text;

namespace Masterloop.Cloud.BusinessLayer.Services.Security
{
    public class PasswordGenerator
    {
        public static string GenerateRandomString(int length)
        {
            const string chars = "23456789abdefghmnpqrtyABDEFGHLMNPQRTY";
            StringBuilder sb = new StringBuilder();
            Random rnd = new Random((int)DateTime.UtcNow.Ticks);
            for (int i = 0; i < length; i++)
            {
                int index = rnd.Next(chars.Length);
                sb.Append(chars[index]);
            }
            return sb.ToString();
        }

        public static string GenerateSafeGuidString()
        {
            return Guid.NewGuid().ToString("n");
        }
    }
}