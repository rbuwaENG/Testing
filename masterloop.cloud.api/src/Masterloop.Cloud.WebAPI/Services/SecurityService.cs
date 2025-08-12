using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.Core.Security;
using Masterloop.Cloud.WebAPI.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Masterloop.Cloud.WebAPI.Services
{
    public class SecurityService : ISecurityService
    {
        private readonly TokenAuthentication _tokenSettings;
        private readonly ISecurityManager _securityManager;

        public SecurityService(
            IOptions<TokenAuthentication> tokenSettings,
            ISecurityManager securityManager
            )
        {
            _tokenSettings = tokenSettings.Value;
            _securityManager = securityManager;
        }

        public UserLoginResult GetToken(UserLogin login)
        {
            var account = _securityManager.Authenticate(login.UserName, login.Password);
            if (account != null)
            {
                return GenerateToken(account);
            }
            else
            {
                return null;
            }
        }

        public UserLoginResult GenerateToken(Account account)
        {
            var claims = new List<Claim>()
            {
                new Claim(ClaimTypes.Name, account.AccountId),
                new Claim(JwtRegisteredClaimNames.Sub, account.AccountId)
            };

            var accessToken = GenerateAccessToken(claims, out double expiresIn);

            return new UserLoginResult { access_token = accessToken, expires_in = (int)expiresIn, token_type = "bearer" };
        }

        private string GenerateAccessToken(IEnumerable<Claim> claims, out double expiresInSeconds)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_tokenSettings.SecretKey);
            var expires = new TimeSpan(5, 0, 0, 0);
            expiresInSeconds = expires.TotalSeconds;

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.Add(expires),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var jwt = tokenHandler.CreateToken(tokenDescriptor);
            var token = tokenHandler.WriteToken(jwt);
            return token;
        }
    }
}