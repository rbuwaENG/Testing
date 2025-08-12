using Masterloop.Core.Types.Pulse;

namespace Masterloop.Cloud.Core.Pulse
{
    public class DetailedPulsePeriod : IdentifiedPulsePeriod
    {
        public string MID { get; set; }
        public int MaximumAbsence { get; set; }
    }
}