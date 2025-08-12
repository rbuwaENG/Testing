using System;
using System.Collections.Generic;
using Masterloop.Core.Types.EventLog;

namespace Masterloop.Cloud.Storage.Repositories.Interfaces
{
    public interface IEventLogRepository
    {
        bool Create(SystemEvent systemEvent);
        bool Create(string MID, DeviceEvent deviceEvent);
        bool Create(string userId, UserEvent userEvent);

        IEnumerable<SystemEvent> GetSystemEvents(DateTime from, DateTime to);
        IEnumerable<DeviceEvent> GetDeviceEvents(string MID, DateTime from, DateTime to);
        IEnumerable<UserEvent> GetUserEvents(string userId, DateTime from, DateTime to);
    }
}