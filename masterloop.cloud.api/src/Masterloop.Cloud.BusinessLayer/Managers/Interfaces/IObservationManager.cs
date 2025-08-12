using System;
using System.Collections.Generic;
using Masterloop.Core.Types.Base;
using Masterloop.Core.Types.Observations;

namespace Masterloop.Cloud.BusinessLayer.Managers.Interfaces
{
    public interface IObservationManager
    {
        ExpandedObservationValue GetCurrentObservation(string MID, int observationId, DataType dataType);
        ExpandedObservationValue[] GetCurrentObservations(string MID, Dictionary<int, DataType> dataTypes);
        ExpandedObservationValue[] GetObservationHistory(string MID, int observationId, DataType dataType, DateTime from, DateTime to);
        bool PublishObservations(string MID, IdentifiedObservations[] observations, Dictionary<int, DataType> dataTypes);
        int DeleteObservationHistory(string MID, int observationId, DateTime from, DateTime to);
        int DeleteObservationHistory(string MID);
        bool StoreObservations(string MID, IdentifiedObservations[] observations, Dictionary<int, DataType> dataTypes);
    }
}