using System;
using System.IO;
using Masterloop.Core.Types.Devices;
using Masterloop.Plugin.Application;
using System.Linq;
using System.Collections.Generic;
using System.Diagnostics;
using Masterloop.Core.Types.Base;
using Masterloop.Cloud.Storage.Codecs;
using Masterloop.Tools.AdminTool.Extensions;
using Masterloop.Core.Types.Observations;

namespace Masterloop.Tools.AdminTool
{
    public class ExportImportTool
    {
        private MasterloopServerConnection _source;
        private string _host, _user, _passwd;

        public ExportImportTool(string sourceHost, string sourceUser, string sourcePasswd)
        {
            _source = new MasterloopServerConnection(sourceHost, sourceUser, sourcePasswd);
            _host = sourceHost;
            _user = sourceUser;
            _passwd = sourcePasswd;
        }

        /// <summary>
        /// Export observations into files
        /// </summary>
        /// <param name="mid">Device identification number</param>
        /// <param name="observationId"></param>
        /// <param name="fromDate">Datetime of the data export starts</param>
        /// <param name="toDate">Datetime of the data export stop at</param>
        /// <param name="chunkSize">Data export split ino small chunks. A chunk represent the number of hours</param>
        /// <param name="outputDirectory">Root location where export files are stored</param>
        public void ExportObservations(string mid, int? observationId, DateTime fromDate, DateTime toDate, int chunkSize, string outputDirectory)
        {
            Trace.TraceInformation($"Getting template for device {mid}");
            DeviceTemplate template = _source.GetDeviceTemplate(mid);
            Dictionary<int, DataType> observations = GetObservations(observationId, template);

            foreach (var observation in observations)
            {
                int oid = observation.Key;
                DataType dataType = observation.Value;
                string[] obsPathDirectories = { outputDirectory, template.Id, mid, oid.ToString() };
                string obsDirectory = Path.Combine(obsPathDirectories);
                Trace.TraceInformation($"Start export observation for observation Id: {oid}");
                ChunkObservations(mid, oid, dataType, fromDate, toDate, chunkSize, obsDirectory);
            }

            Trace.TraceInformation($"Export completed for device {mid}");
        }

        public void ImportObservations(string mid, int? observationId, string rootFileLocation)
        {
            DeviceTemplate template = _source.GetDeviceTemplate(mid);
            if (template == null) return;

            string[] midDirectories = Directory.GetDirectories(@$"{rootFileLocation}\{template.Id}");
            foreach (string midDirectory in midDirectories)
            {
                var obsDirectories = Directory.GetDirectories(midDirectory);
                foreach (string obsDirectory in obsDirectories)
                {
                    var files = Directory.GetFiles(obsDirectory, "*.cos");
                    foreach (string file in files)
                    {
                        var fileData = File.ReadAllBytes(file);
                        Console.WriteLine(Path.GetFileName(file));
                        DeserializeObservationChunk(fileData);
                    }
                }
            }
        }

        public void DeleteDeviceObservationsCurrent(string mid)
        {
            ExtendedWebClient client = new ExtendedWebClient()
            {
                Username = _user,
                Password = _passwd
            };
            string url = $"https://{_host}/api/devices/{mid}/observations/current";
            string result = client.Delete(url);
        }

        public void DeleteDeviceObservationsHistory(string mid, int observationId, DateTime from, DateTime to)
        {
            ExtendedWebClient client = new ExtendedWebClient()
            {
                Username = _user,
                Password = _passwd
            };
            string url = $"https://{_host}/api/devices/{mid}/observations/{observationId}/observations?fromTimestamp={from:o}&toTimestamp={to:o}";
            string result = client.Delete(url);
        }

        /// <summary>
        /// Get a collection of observation, including observation Id and DataType
        /// </summary>
        /// <param name="observationId">Optional parameter</param>
        /// <param name="template">Template Details</param>
        /// <returns>
        /// If the observationId is provided, return collection includes the observation Id and the DataType of observation provided.
        /// If observationId not provided, return collection includes observation Id and DataType of all the observations in the template.
        /// </returns>
        private Dictionary<int, DataType> GetObservations(int? observationId, DeviceTemplate template)
        {
            Dictionary<int, DataType> observations = new Dictionary<int, DataType>();

            if (observationId.HasValue)
            {
                DeviceObservation observation = template.Observations.First(o => o.Id.Equals(observationId));
                observations.Add(observation.Id, observation.DataType);
            }
            else
            {
                foreach (DeviceObservation observation in template.Observations)
                {
                    observations.Add(observation.Id, observation.DataType);
                }
            }
            return observations;
        }
        
        #region Save serialize observation chunks to files

        /// <summary>
        /// observation collection convert into IdentifiedObservations and serialize IdentifiedObservations collection using COSWriter
        /// </summary>
        /// <param name="observations">Observation collection</param>
        /// <param name="observationId">Observation identification</param>
        /// <param name="dataType">Data type of the observation</param>
        /// <returns>Byte array of serialize observation collection</returns>
        private byte[] SerializeObservationChunk(Observation[] observations, int observationId, DataType dataType)
        {
            COSWriter writer = new COSWriter();
            foreach (Observation o in observations)
            {
                IdentifiedObservation obs = o.ConvertoToIdentifiedObservation(observationId, dataType);
                writer.AddObservation(obs, dataType);
            }

            return writer.Serialize(1, (byte)COSHeaderFlag.COS_HEADER_64BIT_TIMESTAMPS);
        }

        /// <summary>
        /// Chunk observations into separate files in-between define from and to date
        /// </summary>
        /// <param name="mid">Device identification number</param>
        /// <param name="observationId">Observation identification</param>
        /// <param name="dataType">Data type of the observation</param>
        /// <param name="fromDate">Datetime of the data export starts</param>
        /// <param name="toDate">Datetime of the data export stop at</param>
        /// <param name="chunkSize">Data export split ino small chunks. A chunk represent the number of hours</param>
        /// <param name="obsDirectory">Specified location where individual observation files are stored</param>
        private void ChunkObservations(string mid, int observationId, DataType dataType, DateTime fromDate, DateTime toDate, int chunkSize, string obsDirectory)
        {
            DateTime chunkFromDateTime = fromDate;
            DateTime chunkToDateTime = fromDate;
            int totalChunkSize = chunkSize;

            double totalHours = toDate.Subtract(fromDate).TotalHours;
            double numberOfChunk = totalHours / chunkSize;

            for (int chunk = 0; chunk < numberOfChunk; chunk++)
            {
                chunkToDateTime = chunkToDateTime.AddHours(chunkSize);

                if (totalChunkSize > totalHours)
                    chunkToDateTime = toDate;

                SaveObservationChunkIntoFile(mid, observationId, dataType, obsDirectory, chunkFromDateTime, chunkToDateTime);

                chunkFromDateTime = chunkToDateTime;
                totalChunkSize += chunkSize;
            }
        }

        private void SaveObservationChunkIntoFile(string mid, int observationId, DataType dataType, string obsDirectory,
            DateTime chunkFromDateTime, DateTime chunkToDateTime)
        {
            Observation[] observations =
                _source.GetObservations(mid, observationId, dataType, chunkFromDateTime, chunkToDateTime);

            if (observations != null && observations.Length > 0)
            {
                Trace.TraceInformation($"{observations.Length} observations are received for the observation Id: {observationId}, from {chunkFromDateTime} to {chunkToDateTime}");

                byte[] cosData = SerializeObservationChunk(observations, observationId, dataType);

                string chunk =
                    @$"{mid}_{observationId}_{chunkFromDateTime:yyyyMMdd-HHmmss}_{chunkToDateTime:yyyyMMdd-HHmmss}.cos";
                SaveFile(cosData, Path.Combine(obsDirectory, chunk));
            }
            else
            {
                Trace.TraceInformation($"Observations are not available for the observation Id: {observationId}, from {chunkFromDateTime} to {chunkToDateTime}");
            }
        }

        private void SaveFile(byte[] data, string outputFile)
        {
            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(outputFile)!);
                using var writer = new BinaryWriter(File.OpenWrite(outputFile));
                writer.Write(data);
            }
            catch (Exception ex)
            {
                Trace.TraceError($"Failed to create the file: {ex}");
            }
        }

        #endregion

        #region private Deserialize

        private void DeserializeObservationChunk(byte[] cosData)
        {
            var reader = new COSReader();
            reader.Open(cosData);
            for (int i = 0; i < reader.GetNumberOfObservations(); i++)
            {
                IdentifiedObservation io = reader.GetObservation(i);
                DataType dataType = reader.GetDataType(i);

                Console.WriteLine($"[{i}]");
                Console.WriteLine($"Id={io.ObservationId}");
                Console.WriteLine($"Type={dataType}");
                Console.WriteLine($"Timestamp={io.Observation.Timestamp}");
                switch (dataType)
                {
                    case DataType.Boolean: Console.WriteLine($"Value={((BooleanObservation)io.Observation).Value}"); break;
                    case DataType.Double: Console.WriteLine($"Value={((DoubleObservation)io.Observation).Value}"); break;
                    case DataType.Integer: Console.WriteLine($"Value={((IntegerObservation)io.Observation).Value}"); break;
                    case DataType.Position: Console.WriteLine($"Value={DataTypeStringConverter.FormatPosition(((PositionObservation)io.Observation).Value)}"); break;
                    case DataType.String: Console.WriteLine($"Value={((StringObservation)io.Observation).Value}"); break;
                    case DataType.Statistics: Console.WriteLine($"Value={((StatisticsObservation)io.Observation).Value}"); break;
                }
            }
        }

        #endregion
    }
}
