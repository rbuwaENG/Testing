using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.BusinessLayer.Services.RMQ;
using Masterloop.Cloud.Core.Observation;
using Masterloop.Cloud.Core.RMQ;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Base;
using Masterloop.Core.Types.Observations;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Masterloop.Cloud.BusinessLayer.Managers
{
    public class ObservationManager : IObservationManager
    {
        private readonly IObservationRepository _observationRepository;
        private readonly IRMQPublishService _rmqPublishService;

        public ObservationManager(IObservationRepository observationRepository, IRMQPublishService rmqPublishService)
        {
            _observationRepository = observationRepository;
            _rmqPublishService = rmqPublishService;
        }

        #region Read
        public ExpandedObservationValue GetCurrentObservation(string MID, int observationId, DataType dataType)
        {
            var dictionary = new Dictionary<int, DataType>();
            dictionary.Add(observationId, dataType);
            return _observationRepository.GetCurrent(MID, dataType, observationId);
        }

        public ExpandedObservationValue[] GetCurrentObservations(string MID, Dictionary<int, DataType> dataTypes)
        {
            return _observationRepository.GetCurrent(MID, dataTypes);
        }

        public ExpandedObservationValue[] GetObservationHistory(string MID, int observationId, DataType dataType, DateTime from, DateTime to)
        {
            return _observationRepository.GetHistory(MID, observationId, dataType, from, to);
        }
        #endregion

        #region Delete
        public int DeleteObservationHistory(string MID, int observationId, DateTime from, DateTime to)
        {
            return _observationRepository.DeleteHistory(MID, observationId, from, to);
        }

        public int DeleteObservationHistory(string MID)
        {
            return _observationRepository.DeleteHistory(MID);
        }
        #endregion

        #region Create
        public bool PublishObservations(string MID, IdentifiedObservations[] observations, Dictionary<int, DataType> dataTypes)
        {
            if (observations.Length > 0)
            {
                List<ObservationMessage> messages = new List<ObservationMessage>();
                foreach (IdentifiedObservations io in observations)
                {
                    foreach (Observation o in io.Observations)
                    {
                        ObservationMessage message = new ObservationMessage()
                        {
                            MID = MID,
                            Observation = o,
                            ObservationId = io.ObservationId,
                            ObservationType = dataTypes[io.ObservationId]
                        };
                        messages.Add(message);
                    }
                }
                if (_rmqPublishService.Connect())
                {
                    if (_rmqPublishService.PublishObservations(messages.ToArray()))
                    {
                        return true;
                    }

                }
            }
            return false;
        }

        public bool StoreObservations(string MID, IdentifiedObservations[] observations, Dictionary<int, DataType> dataTypes)
        {
            List<StoredObservation> storedObservations = new List<StoredObservation>();
            foreach (IdentifiedObservations o in observations)
            {
                foreach (Observation o1 in o.Observations)
                {
                    StoredObservation so = new StoredObservation()
                    {
                        MID = MID,
                        Observation = new ExpandedObservationValue(o.ObservationId, dataTypes[o.ObservationId], o1)
                    };
                    storedObservations.Add(so);
                }
            }
            bool fastInsert = !storedObservations.Any(o => o.Observation.Timestamp < DateTime.UtcNow.AddDays(-6));

            StoredObservation[] obs = storedObservations.ToArray();

            if (_observationRepository.CreateCurrent(obs) > 0)
            {
                return _observationRepository.CreateHistory(obs, fastInsert);
            }
            else
            {
                return false;
            }
        }
        #endregion
    }
}