using System;
using System.Collections.Concurrent;

namespace Masterloop.Cloud.WebAPI.Services
{
    public interface IAuthorizationCodeStore
    {
        void Store(AuthorizationCode code);
        AuthorizationCode Find(string code);
        bool Consume(string code);
    }

    public class InMemoryAuthorizationCodeStore : IAuthorizationCodeStore
    {
        private readonly ConcurrentDictionary<string, AuthorizationCode> _codes = new();

        public void Store(AuthorizationCode code)
        {
            _codes[code.Code] = code;
        }

        public AuthorizationCode Find(string code)
        {
            if (string.IsNullOrWhiteSpace(code)) return null;
            _codes.TryGetValue(code, out var value);
            return value;
        }

        public bool Consume(string code)
        {
            if (string.IsNullOrWhiteSpace(code)) return false;
            if (_codes.TryGetValue(code, out var value))
            {
                value.IsConsumed = true;
                return true;
            }
            return false;
        }
    }

    public class AuthorizationCode
    {
        public string Code { get; set; }
        public string ClientId { get; set; }
        public string RedirectUri { get; set; }
        public string Subject { get; set; }
        public string CodeChallenge { get; set; }
        public string CodeChallengeMethod { get; set; }
        public string Scope { get; set; }
        public DateTime ExpiresAtUtc { get; set; }
        public bool IsConsumed { get; set; }
    }
}