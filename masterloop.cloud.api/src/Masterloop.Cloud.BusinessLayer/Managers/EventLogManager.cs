using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.EventLog;
using System;
using System.Collections.Generic;

namespace Masterloop.Cloud.BusinessLayer.Managers
{
    public class EventLogManager : IEventLogManager
    {
        private IEventLogRepository _eventLogRepository;

        public EventLogManager(IEventLogRepository eventLogRepository)
        {
            _eventLogRepository = eventLogRepository;
        }

        public void StoreDeviceEvent(string MID, DeviceEvent deviceEvent)
        {
            _eventLogRepository.Create(MID, deviceEvent);
        }

        public IEnumerable<DeviceEvent> GetDeviceEvents(string MID, DateTime from, DateTime to)
        {
            return _eventLogRepository.GetDeviceEvents(MID, from, to);
        }

        public void StoreUserEvent(string userId, UserEvent userEvent)
        {
            _eventLogRepository.Create(userId, userEvent);
        }

        public IEnumerable<UserEvent> GetUserEvents(string userId, DateTime from, DateTime to)
        {
            return _eventLogRepository.GetUserEvents(userId, from, to);
        }

        public void StoreSystemEvent(SystemEvent systemEvent)
        {
            _eventLogRepository.Create(systemEvent);
        }

        public IEnumerable<SystemEvent> GetSystemEvents(DateTime from, DateTime to)
        {
            return _eventLogRepository.GetSystemEvents(from, to);
        }
    }
}