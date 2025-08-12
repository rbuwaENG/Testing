using System;
using System.Collections.Generic;
using Masterloop.Cloud.Core.Pulse;
using Masterloop.Core.Types.Pulse;

namespace Masterloop.Cloud.Storage.Repositories.Interfaces
{
    public interface IPulseRepository
    {
        DetailedPulsePeriod GetCurrent(string MIDs, int pulseId);
        IEnumerable<DetailedPulsePeriod> GetCurrent(string[] MIDs, int pulseId);
        IEnumerable<PulsePeriod> GetHistory(string MID, int pulseId, DateTime from, DateTime to);
        bool UpdateCurrent(DetailedPulsePeriod pulsePeriod);
        bool CreateCurrent(DetailedPulsePeriod pulsePeriod);
        bool CreateHistory(DetailedPulsePeriod pulsePeriod);
    }
}