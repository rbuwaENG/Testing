using System;

namespace Masterloop.Cloud.PulseWorker
{
    public class PulseState
    {
        public string MID { get; set; }
        public DateTime NextPulse { get; set; }
    }
}