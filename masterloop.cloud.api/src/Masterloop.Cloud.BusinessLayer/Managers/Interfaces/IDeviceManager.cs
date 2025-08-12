using Masterloop.Core.Types.Devices;

namespace Masterloop.Cloud.BusinessLayer.Managers.Interfaces
{
    public interface IDeviceManager
    {
        DetailedDevice GetDevice(string MID, bool includeMetadata);
        DetailedDevice[] GetDevices(string[] MID, bool includeMetadata);
        SecureDetailedDevice GetSecureDevice(string MID, bool includeMetadata);
        DetailedDevice[] GetDevicesByTenant(int tenantId, bool includeMetadata, bool includeDetails);
        DetailedDevice[] GetDevicesByTemplate(string TID, bool includeMetadata, bool includeDetails);
        SecureDetailedDevice CreateDevice(NewDevice newDevice);
        void RMQCreateDevice(string TID, string MID, string PSK, DeviceProtocolType protocol);
        void RMQCreateDeviceAccount(string MID, string PSK, DeviceProtocolType protocol);
        DetailedDevice UpdateDevice(Device updatedDevice);
        void DeleteDevice(string MID);
        string GetMID();
        bool MIDLengthOK(string MID);
        bool MIDExists(string MID);
        bool MIDContainsValidCharacters(string MID);
        void ValidateMID(string MID);
    }
}