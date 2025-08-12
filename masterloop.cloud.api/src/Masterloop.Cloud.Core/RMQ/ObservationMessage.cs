using Masterloop.Core.Types.Base;

namespace Masterloop.Cloud.Core.RMQ
{
    public class ObservationMessage
    {
        public string MID { get; set; }
        public int ObservationId { get; set; }
        public Masterloop.Core.Types.Observations.Observation Observation { get; set; }
        public DataType ObservationType { get; set; }
    }
}