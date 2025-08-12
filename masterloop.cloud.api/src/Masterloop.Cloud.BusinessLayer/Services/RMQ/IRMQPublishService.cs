using System;
using Masterloop.Cloud.Core.RMQ;
using Masterloop.Cloud.Core.SystemNotification;
using Masterloop.Core.Types.Pulse;

namespace Masterloop.Cloud.BusinessLayer.Services.RMQ
{
    public interface IRMQPublishService : IDisposable
    {
        bool Connect();
        void Disconnect();
        bool IsConnected();
        bool PublishObservations(ObservationMessage[] observations, int expiration = 0, bool persistent = false);
        bool PublishObservations(ObservationMessage[] observations, string exchangeName, int expiration = 0, bool persistent = false);
        bool PublishCommand(CommandMessage command, bool persistent = false);
        bool PublishCommandResponse(CommandResponseMessage commandResponse, int expiration = 0, bool persistent = false);
        bool PublishSystemNotification(SystemNotificationCategory category, SystemNotification notification, int expiration = 0, bool persistent = false);
        bool PublishPulse(Pulse pulse, int expiration = 0, bool persistent = false);
    }
}