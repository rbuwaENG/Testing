using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.Core.Pulse;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Devices;
using Masterloop.Core.Types.Pulse;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Masterloop.Cloud.BusinessLayer.Managers
{
    public class PulseManager : IPulseManager
    {
        private readonly IPulseRepository _pulseRepository;

        public PulseManager(IPulseRepository pulseRepository)
        {
            _pulseRepository = pulseRepository;
        }

        public DetailedPulsePeriod GetCurrentPulsePeriod(string MID, int pulseId)
        {
            return _pulseRepository.GetCurrent(MID, pulseId);
        }

        public DetailedPulsePeriod[] GetCurrentPulsePeriods(string[] MIDs, int pulseId)
        {
            return _pulseRepository.GetCurrent(MIDs, pulseId).ToArray();
        }

        public PulsePeriod[] GetPulsePeriods(string MID, int pulseId, DateTime from, DateTime to)
        {
            List<PulsePeriod> pulses = new List<PulsePeriod>();
            IEnumerable<PulsePeriod> pulseHistory = _pulseRepository.GetHistory(MID, pulseId, from, to);
            DetailedPulsePeriod currentPulse = _pulseRepository.GetCurrent(MID, pulseId);
            if (pulseHistory != null)
            {
                pulses.AddRange(pulseHistory);
            }
            if (currentPulse != null)
            {
                if (!(currentPulse.To < from || currentPulse.From > to))
                {
                    pulses.Add(currentPulse);
                }
            }
            return pulses.ToArray();
        }

        public void AppendPulse(Pulse pulse, DeviceTemplate template)
        {
            DevicePulse devicePulse = template.Pulses.SingleOrDefault(p => p.Id == pulse.PulseId);
            if (devicePulse == null) return;

            // Get Device Pulse Record from cache
            DetailedPulsePeriod cachedPulsePeriod = GetCurrentPulsePeriod(pulse.MID, pulse.PulseId);

            if (cachedPulsePeriod != null)
            {
                // If Device Pulse Period exists
                TimeSpan ts = pulse.Timestamp - cachedPulsePeriod.To;
                if (ts.TotalSeconds > devicePulse.MaximumAbsence)
                {
                    _pulseRepository.CreateHistory(cachedPulsePeriod);

                    // Create new pulse period
                    cachedPulsePeriod = new DetailedPulsePeriod()
                    {
                        Id = pulse.PulseId,
                        MID = pulse.MID,
                        From = pulse.Timestamp,
                        MaximumAbsence = devicePulse.MaximumAbsence,
                        PulseCount = 0
                    };
                }
                cachedPulsePeriod.To = pulse.Timestamp;
                cachedPulsePeriod.PulseCount++;
            }
            else
            {
                // Create new Device Pulse Period record
                if (template != null)
                {
                    if (template.Pulses != null)
                    {
                        if (template.Pulses.Count(p => p.Id == pulse.PulseId) == 1)
                        {
                            cachedPulsePeriod = new DetailedPulsePeriod()
                            {
                                Id = pulse.PulseId,
                                MID = pulse.MID,
                                From = pulse.Timestamp,
                                To = pulse.Timestamp,
                                MaximumAbsence = devicePulse.MaximumAbsence,
                                PulseCount = 1
                            };
                        }
                    }
                }
            }

            if (cachedPulsePeriod != null)
            {
                _pulseRepository.UpdateCurrent(cachedPulsePeriod);
            }
        }
    }
}
