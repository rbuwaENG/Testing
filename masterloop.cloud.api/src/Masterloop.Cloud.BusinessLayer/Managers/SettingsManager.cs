using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Devices;
using Masterloop.Core.Types.Settings;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Masterloop.Cloud.BusinessLayer.Managers
{
    public class SettingsManager : ISettingsManager
    {
        ISettingsRepository _settingsRepository;
        ITemplateRepository _templateRepository;
        IDeviceRepository _deviceRepository;

        public SettingsManager(ISettingsRepository settingsRepository, ITemplateRepository templateRepository, IDeviceRepository deviceRepository)
        {
            _settingsRepository = settingsRepository;
            _templateRepository = templateRepository;
            _deviceRepository = deviceRepository;
        }

        public SettingsPackage GetDeviceSettings(string MID)
        {
            // Get device
            DetailedDevice device = _deviceRepository.Get(MID);
            if (device == null) throw new ArgumentException($"Device not found: {MID}");

            // Get device settings.
            SettingsPackage deviceSettings = _settingsRepository.Get(MID);

            // Get device template settings, and merge with device settings.
            DeviceTemplate template = _templateRepository.Get(device.TemplateId);

            List<SettingValue> values = new List<SettingValue>();
            if (template.Settings != null && template.Settings.Length > 0)
            {
                DateTime templateSettingLastUpdatedOn = template.Settings.Max(s => s.LastUpdatedOn);
                foreach (DeviceSetting deviceSetting in template.Settings)
                {
                    SettingValue sv = new SettingValue()
                    {
                        Id = deviceSetting.Id,
                        Value = deviceSetting.DefaultValue  // Initialize value with default device template value
                    };
                    if (deviceSettings != null)
                    {
                        if (deviceSettings.Values.Count(ss => ss.Id == deviceSetting.Id) > 0)  // Use device setting value if found
                        {
                            sv.Value = deviceSettings.Values.Where(ss => ss.Id == deviceSetting.Id).First().Value;
                        }
                    }
                    values.Add(sv);
                }
                DateTime deviceLastUpdatedOn = deviceSettings == null ? device.UpdatedOn : deviceSettings.LastUpdatedOn;
                SettingsPackage sp = new SettingsPackage()
                {
                    MID = MID,
                    LastUpdatedOn = templateSettingLastUpdatedOn > deviceLastUpdatedOn ? templateSettingLastUpdatedOn : deviceLastUpdatedOn,
                    Values = values.ToArray()
                };
                return sp;
            }
            else
            {
                return null;
            }
        }

        public ExpandedSettingsPackage GetExpandedDeviceSettings(string MID)
        {
            // Get device
            DetailedDevice device = _deviceRepository.Get(MID);
            if (device == null) throw new ArgumentException($"Device not found: {MID}");

            // Get device settings.
            SettingsPackage deviceSettings = _settingsRepository.Get(MID);

            // Get device template settings, and merge with device settings.
            DeviceTemplate template = _templateRepository.Get(device.TemplateId);

            List<ExpandedSettingValue> expandedValues = new List<ExpandedSettingValue>();
            if (template.Settings != null && template.Settings.Length > 0)
            {
                DateTime templateSettingLastUpdatedOn = template.Settings.Max(s => s.LastUpdatedOn);
                foreach (DeviceSetting deviceSetting in template.Settings)
                {
                    ExpandedSettingValue esv = new ExpandedSettingValue()
                    {
                        Id = deviceSetting.Id,
                        Name = deviceSetting.Name,
                        DataType = deviceSetting.DataType,
                        Value = deviceSetting.DefaultValue,  // Initialize value with default device template value
                        IsDefaultValue = true
                    };
                    if (deviceSettings != null)
                    {
                        if (deviceSettings.Values.Count(ss => ss.Id == deviceSetting.Id) > 0)  // Use device setting value if found
                        {
                            esv.Value = deviceSettings.Values.Where(ss => ss.Id == deviceSetting.Id).First().Value;
                            esv.IsDefaultValue = false;
                        }
                    }
                    expandedValues.Add(esv);
                }
                DateTime deviceLastUpdatedOn = deviceSettings == null ? device.UpdatedOn : deviceSettings.LastUpdatedOn;
                ExpandedSettingsPackage esp = new ExpandedSettingsPackage()
                {
                    MID = MID,
                    LastUpdatedOn = templateSettingLastUpdatedOn > deviceLastUpdatedOn ? templateSettingLastUpdatedOn : deviceLastUpdatedOn,
                    Values = expandedValues.ToArray()
                };
                return esp;
            }
            else
            {
                return null;
            }
        }

        public void SetDeviceSettings(string MID, SettingValue[] values)
        {
            //TODO: Validate according to device template
            SettingsPackage settingsPackage = new SettingsPackage()
            {
                MID = MID,
                LastUpdatedOn = DateTime.UtcNow,
                Values = values
            };
            _settingsRepository.Create(settingsPackage);
        }
    }
}