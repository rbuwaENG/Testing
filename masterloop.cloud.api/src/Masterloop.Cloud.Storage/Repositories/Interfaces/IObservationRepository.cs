using System;
using System.Collections.Generic;
using Masterloop.Cloud.Core.Observation;
using Masterloop.Core.Types.Base;
using Masterloop.Core.Types.Observations;

namespace Masterloop.Cloud.Storage.Repositories.Interfaces
{
    public interface IObservationRepository
    {
        ExpandedObservationValue GetCurrent(string MID, DataType dataType, int observationId);
        ExpandedObservationValue[] GetCurrent(string MID, Dictionary<int, DataType> observations);
        ExpandedObservationValue[] GetHistory(string MID, int observationId, DataType dataType, DateTime from, DateTime to);
        int CreateCurrent(StoredObservation[] observations);
        bool CreateHistory(StoredObservation[] observations, bool batchInsert);
        int DeleteHistory(string MID, int observationId, DateTime from, DateTime to);
        int DeleteHistory(string MID);
        bool DeleteCurrent(string MID, int observationId);
        bool DeleteCurrent(string MID);
    }
}