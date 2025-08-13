namespace Masterloop.Cloud.WebAPI.Services
{
    public interface ITotpService
    {
        string GenerateSecretKey();
        string GenerateTotpCode(string secretKey);
        bool ValidateTotpCode(string secretKey, string totpCode);
    }
}