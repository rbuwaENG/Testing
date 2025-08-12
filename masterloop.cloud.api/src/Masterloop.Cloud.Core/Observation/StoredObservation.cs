using Masterloop.Core.Types.Observations;

namespace Masterloop.Cloud.Core.Observation
{
    public class StoredObservation
    {
        public string MID { get; set; }
        public ExpandedObservationValue Observation { get; set; }
    }
}