using System;
using System.Collections.Generic;
using Masterloop.Core.Types.EventLog;

namespace Masterloop.Cloud.BusinessLayer.Managers.Interfaces
{
    public interface IEventLogManager
    {
        void StoreDeviceEvent(string MID, DeviceEvent deviceEvent);
        IEnumerable<DeviceEvent> GetDeviceEvents(string MID, DateTime from, DateTime to);
        void StoreUserEvent(string userId, UserEvent userEvent);
        IEnumerable<UserEvent> GetUserEvents(string userId, DateTime from, DateTime to);
        void StoreSystemEvent(SystemEvent systemEvent);
        IEnumerable<SystemEvent> GetSystemEvents(DateTime from, DateTime to);
    }
}