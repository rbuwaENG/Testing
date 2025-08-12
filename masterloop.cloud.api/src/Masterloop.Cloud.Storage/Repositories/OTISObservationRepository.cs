using System;
using Masterloop.Cloud.Core.Observation;
using System.Collections.Generic;
using Masterloop.Cloud.Storage.Providers;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Base;
using Masterloop.Core.Types.Observations;
using StackExchange.Redis;

namespace Masterloop.Cloud.Storage.Repositories
{
    /// <summary>
    /// Repository for observations using Redis Cache and OTIS (Observation Time Series based on COS format).
    /// </summary>
    public class OTISObservationRepository : IObservationRepository
    {
        protected ICacheProvider _cacheProvider;
        protected IBlobProvider _blobProvider;

        public OTISObservationRepository(ICacheProvider cacheProvider, IBlobProvider blobProvider)
        {
            _cacheProvider = cacheProvider;
            _blobProvider = blobProvider;
        }

        public ExpandedObservationValue GetCurrent(string MID, DataType dataType, int observationId)
        {
            throw new NotImplementedException();
        }

        public ExpandedObservationValue[] GetCurrent(string MID, Dictionary<int, DataType> observations)
        {
            throw new NotImplementedException();
        }

        public ExpandedObservationValue[] GetHistory(string MID, int observationId, DataType dataType, DateTime from, DateTime to)
        {
            throw new NotImplementedException();
        }

        public int CreateCurrent(StoredObservation[] observations)
        {
            throw new NotImplementedException();
        }

        public bool CreateHistory(StoredObservation[] observations, bool batchInsert)
        {
            if (batchInsert)
            {
                throw new NotSupportedException("OTISObservationRepository.CreateHistory: Batch inserts are currently not supported.");
            }

            foreach (StoredObservation so in observations)
            {
                if (!AppendObservationToHistory(so.MID, so.Observation.Id, so.Observation.DataType, so.Observation.ToObservation()))
                {
                    return false;
                }
            }
            return true;
        }

        private bool AppendObservationToHistory(string MID, int observationId, DataType dataType, Observation observation)
        {
            throw new NotImplementedException();
            // Key: MID
            // Set: [ObsId] -> Array of COS observations (binary) in COS file format with COS flags:
            //      COS_HEADER_MULTI_TIMESTAMPS | COS_HEADER_64BIT_TIMESTAMPS

            //RedisValue value = _cacheProvider.GetDatabase(RedisTables.ObservationHistory).HashGet(MID, observationId);
            //if (value.HasValue)
            //{
            //}
        }

        public int DeleteHistory(string MID, int observationId, DateTime from, DateTime to)
        {
            throw new NotImplementedException();
        }

        public int DeleteHistory(string MID)
        {
            throw new NotImplementedException();
        }

        public bool DeleteCurrent(string MID, int observationId)
        {
            throw new NotImplementedException();
        }

        public bool DeleteCurrent(string MID)
        {
            throw new NotImplementedException();
        }
    }
}

