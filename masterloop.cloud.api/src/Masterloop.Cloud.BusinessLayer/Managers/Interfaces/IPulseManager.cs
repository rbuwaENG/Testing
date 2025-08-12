using System;
using Masterloop.Cloud.Core.Pulse;
using Masterloop.Core.Types.Devices;
using Masterloop.Core.Types.Pulse;

namespace Masterloop.Cloud.BusinessLayer.Managers.Interfaces
{
    public interface IPulseManager
    {
        DetailedPulsePeriod GetCurrentPulsePeriod(string MID, int pulseId);
        DetailedPulsePeriod[] GetCurrentPulsePeriods(string[] MIDs, int pulseId);
        PulsePeriod[] GetPulsePeriods(string MID, int pulseId, DateTime from, DateTime to);
        void AppendPulse(Pulse pulse, DeviceTemplate template);
    }
}