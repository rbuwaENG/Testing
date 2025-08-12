using System.Collections.Generic;
using Masterloop.Core.Types.Devices;

namespace Masterloop.Cloud.Storage.Repositories.Interfaces
{
    public interface IDeviceRepository : IRepository<SecureDetailedDevice, string>
    {
        SecureDetailedDevice[] Get(string[] ids);
        IEnumerable<SecureDetailedDevice> GetByTemplate(string tid);
        IEnumerable<string> GetMIDsByTemplate(string tid);
    }
}