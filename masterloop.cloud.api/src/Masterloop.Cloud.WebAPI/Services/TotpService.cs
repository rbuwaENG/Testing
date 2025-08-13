using OtpNet;
using System;
using System.Web;

namespace Masterloop.Cloud.WebAPI.Services
{
    public class TotpService : ITotpService
    {
        private const int TotpDigits = 6;
        private const int TotpPeriod = 30;

        public string GenerateSecretKey()
        {
            var key = KeyGeneration.GenerateRandomKey(20); // 160 bits
            return Base32Encoding.ToString(key);
        }

        public string GenerateTotpCode(string secretKey)
        {
            try
            {
                var key = Base32Encoding.ToBytes(secretKey);
                var totp = new Totp(key, totpSize: TotpDigits, step: TotpPeriod);
                return totp.ComputeTotp();
            }
            catch
            {
                return null;
            }
        }

        public bool ValidateTotpCode(string secretKey, string totpCode)
        {
            try
            {
                if (string.IsNullOrEmpty(totpCode) || totpCode.Length != TotpDigits)
                    return false;

                var key = Base32Encoding.ToBytes(secretKey);
                var totp = new Totp(key, totpSize: TotpDigits, step: TotpPeriod);
                
                // Allow for time drift (1 step before and after)
                var timeWindow = new VerificationWindow(previous: 1, future: 1);
                return totp.VerifyTotp(totpCode, out _, timeWindow: timeWindow);
            }
            catch
            {
                return false;
            }
        }

        public string GenerateQrCodeUrl(string email, string secretKey, string issuer = "Masterloop Cloud")
        {
            var manualEntryKey = GenerateManualEntryKey(secretKey, issuer);
            var encodedIssuer = HttpUtility.UrlEncode(issuer);
            var encodedEmail = HttpUtility.UrlEncode(email);
            
            return $"otpauth://totp/{encodedIssuer}:{encodedEmail}?secret={secretKey}&issuer={encodedIssuer}&algorithm=SHA1&digits={TotpDigits}&period={TotpPeriod}";
        }

        public string GenerateManualEntryKey(string secretKey, string issuer = "Masterloop Cloud")
        {
            return $"{issuer}:{secretKey}";
        }
    }
}