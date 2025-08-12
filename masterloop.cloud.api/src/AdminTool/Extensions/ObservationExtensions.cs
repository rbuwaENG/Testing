using Masterloop.Core.Types.Base;
using Masterloop.Core.Types.Observations;

namespace Masterloop.Tools.AdminTool.Extensions
{
    public static class ObservationExtensions
    {
        public static IdentifiedObservation ConvertoToIdentifiedObservation(this Observation observation, int observationId, DataType dataType)
        {
            IdentifiedObservation o = null;
            if (observation != null)
            {
                switch (dataType)
                {
                    case DataType.Integer:
                        o = new IdentifiedObservation
                        {
                            ObservationId = observationId,
                            Observation = (IntegerObservation)observation
                        };
                        break;
                    case DataType.Double:
                        o = new IdentifiedObservation
                        {
                            ObservationId = observationId,
                            Observation = (DoubleObservation)observation
                        };
                        break;
                    case DataType.String:
                        o = new IdentifiedObservation
                        {
                            ObservationId = observationId,
                            Observation = (StringObservation)observation
                        };
                        break;
                    case DataType.Boolean:
                        o = new IdentifiedObservation
                        {
                            ObservationId = observationId,
                            Observation = (BooleanObservation)observation
                        };
                        break;
                    case DataType.Position:
                        o = new IdentifiedObservation
                        {
                            ObservationId = observationId,
                            Observation = (PositionObservation)observation
                        };
                        break;
                    case DataType.Statistics:
                        o = new IdentifiedObservation
                        {
                            ObservationId = observationId,
                            Observation = (StatisticsObservation)observation
                        };
                        break;
                }
            }
            return o;
        }
    }
}
