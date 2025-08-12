using System;
using Masterloop.Core.Types.LiveConnect;

namespace Masterloop.Cloud.BusinessLayer.Managers.Interfaces
{
    public interface ILiveConnectionManager
    {
        DeviceConnection GetDeviceConnection(string MID);
        LiveConnectionDetails CreateTemporaryEndpoint(string userId, string protocol, LiveAppRequest[] requests);
        void DeleteTemporaryEndpoint(string userId, Guid key);
        LiveConnectionDetails GetPersistentEndpoint(string userId, string subscriptionKey, string protocol);
        void CreatePersistentEndpoint(string userId, LivePersistentSubscriptionRequest request);
        bool WhitelistExists(string userId, string subscriptionKey);
        void AddDeviceToWhitelist(string userId, string subscriptionKey, string tid, string mid);
        void RemoveDeviceFromWhitelist(string userId, string subscriptionKey, string tid, string mid);
        void DeletePersistentEndpoint(string userId, string subscriptionKey);
    }
}