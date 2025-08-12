namespace Masterloop.Cloud.WebAPI.Services
{
    public interface ITotpService
    {
        string GenerateSecretKey();
        string GenerateTotpCode(string secretKey);
        bool ValidateTotpCode(string secretKey, string totpCode);
        string GenerateQrCodeUrl(string email, string secretKey, string issuer = "Masterloop Cloud");
        string GenerateManualEntryKey(string secretKey, string issuer = "Masterloop Cloud");
    }
}