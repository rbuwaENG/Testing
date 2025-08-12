using Masterloop.Core.Types.Settings;

namespace Masterloop.Cloud.BusinessLayer.Managers.Interfaces
{
    public interface ISettingsManager
    {
        SettingsPackage GetDeviceSettings(string MID);
        ExpandedSettingsPackage GetExpandedDeviceSettings(string MID);
        void SetDeviceSettings(string MID, SettingValue[] values);
    }
}