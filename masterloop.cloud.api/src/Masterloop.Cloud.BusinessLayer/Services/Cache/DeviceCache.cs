using System.Collections.Generic;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Devices;

namespace Masterloop.Cloud.BusinessLayer.Services.Cache
{
    public class DeviceCache
    {
        private Dictionary<string, string> _devices;  // MID -> TID
        private Dictionary<string, DeviceTemplate> _templates;
        private readonly IDeviceRepository _deviceRepository;
        private readonly ITemplateRepository _templateRepository;

        public DeviceCache(IDeviceRepository deviceRepository, ITemplateRepository templateRepository)
        {
            _deviceRepository = deviceRepository;
            _templateRepository = templateRepository;
            _devices = new Dictionary<string, string>();
            var devices = _deviceRepository.GetAll();
            if (devices != null)
            {
                foreach (var device in devices)
                {
                    _devices.Add(device.MID, device.TemplateId);
                }
            }
            _templates = new Dictionary<string, DeviceTemplate>();
        }

        public DeviceTemplate GetTemplate(string MID)
        {
            // Find TID
            string TID;
            lock (_devices)
            {
                TID = _devices.GetValueOrDefault(MID);
            }
            if (TID == null)
            {
                DetailedDevice device = _deviceRepository.Get(MID);
                if (device != null)
                {
                    TID = device.TemplateId;
                    lock (_devices)
                    {
                        _devices.Add(MID, TID);
                    }
                }
                else
                {
                    return null; // MID does not exist
                }
            }

            // Find device template
            DeviceTemplate dt;
            lock (_templates)
            {
                dt = _templates.GetValueOrDefault(TID);
            }
            if (dt == null)
            {
                dt = _templateRepository.Get(TID);
                if (dt != null)
                {
                    lock (_templates)
                    {
                        _templates.Add(TID, dt);
                    }
                }
                else
                {
                    return null;
                }
            }
            return dt;
        }

        public void RemoveTemplate(string TID)
        {
            lock (_templates)
            {
                _templates.Remove(TID);
            }
        }

        public void RemoveDevice(string MID)
        {
            lock (_devices)
            {
                _devices.Remove(MID);
            }
        }
    }
}
