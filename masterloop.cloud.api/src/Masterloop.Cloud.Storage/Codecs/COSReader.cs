using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using Masterloop.Core.Types.Base;
using Masterloop.Core.Types.Observations;

namespace Masterloop.Cloud.Storage.Codecs
{
    public class COSReader
    {
        #region Members
        List<Tuple<IdentifiedObservation, DataType>> _observations;
        #endregion

        #region Construction
        public COSReader()
        {
            _observations = new List<Tuple<IdentifiedObservation, DataType>>();
        }
        #endregion

        #region Methods
        public void Open(in byte[] cosData)
        {
            using (MemoryStream stream = new MemoryStream(cosData))
            {
                using (BigEndianReader reader = new BigEndianReader(new BinaryReader(stream)))
                {
                    // Deserialize cos argument into _observations array.
                    byte version = reader.ReadByte();
                    switch (version)
                    {
                        case 1:
                        case 2:
                            DeserializeCOS(reader, version);
                            break;
                        default:
                            throw new Exception($"Unsupported COS version: {version}");
                    }
                }
            }
        }

        public int GetNumberOfObservations()
        {
            return _observations.Count;
        }

        public IdentifiedObservation GetObservation(int index)
        {
            return _observations[index].Item1;
        }

        public DataType GetDataType(int index)
        {
            return _observations[index].Item2;
        }
        #endregion

        #region Implementation
        private void DeserializeCOS(BigEndianReader reader, byte version)
        {
            byte cosHeaderFlags = reader.ReadByte();
            ushort sectionCount = reader.ReadUInt16();

            // Read sections
            for (ushort i = 0; i < sectionCount; i++)
            {
                COSObservationType observationType = COSObservationType.COS_OBS_TYPE_UNDEFINED;
                ushort observationId = 0;
                if ((cosHeaderFlags & (byte)COSHeaderFlag.COS_HEADER_MULTI_OBSERVATIONS) == 0)
                {
                    ushort descriptor = reader.ReadUInt16();
                    Tuple<COSObservationType, ushort> sd = DecodeObservationDescriptor(descriptor);
                    observationType = sd.Item1;
                    observationId = sd.Item2;
                }
                DateTime sectionTimestamp = DeserializeTimestamp(reader, cosHeaderFlags);
                ushort observationCount = reader.ReadUInt16();

                // Read observations
                for (ushort j = 0; j < observationCount; j++)
                {
                    if ((cosHeaderFlags & (byte)COSHeaderFlag.COS_HEADER_MULTI_OBSERVATIONS) != 0)
                    {
                        ushort descriptor = reader.ReadUInt16();
                        Tuple<COSObservationType, ushort> sd = DecodeObservationDescriptor(descriptor);
                        observationType = sd.Item1;
                        observationId = sd.Item2;
                    }
                    DateTime observationTimestamp;
                    if ((cosHeaderFlags & (byte)COSHeaderFlag.COS_HEADER_MULTI_TIMESTAMPS) != 0)
                    {
                        if ((cosHeaderFlags & (byte)COSHeaderFlag.COS_HEADER_64BIT_TIMESTAMPS) != 0)
                        {
                            Int64 deltaTicks = reader.ReadInt64();
                            observationTimestamp = new DateTime(sectionTimestamp.Ticks + deltaTicks, DateTimeKind.Utc);
                        }
                        else
                        {
                            ushort deltaSections = reader.ReadUInt16();
                            observationTimestamp = sectionTimestamp.AddSeconds(deltaSections);
                        }
                    }
                    else
                    {
                        observationTimestamp = sectionTimestamp;
                    }
                    Tuple<IdentifiedObservation, DataType> observation = DecodeObservationValue(reader, observationId, observationType, observationTimestamp, cosHeaderFlags);
                    _observations.Add(observation);
                }
            }
        }

        private DateTime DeserializeTimestamp(BigEndianReader reader, byte cosHeaderFlags)
        {
            if ((cosHeaderFlags & (byte)COSHeaderFlag.COS_HEADER_64BIT_TIMESTAMPS) != 0)
            {
                Int64 t64 = reader.ReadInt64();
                return new DateTime(t64, DateTimeKind.Utc);
            }
            else
            {
                UInt32 unixtime = reader.ReadUInt32();
                return new DateTime(1970, 1, 1, 0, 0, 0, 0, System.DateTimeKind.Utc).AddSeconds(unixtime);
            }
        }

        private Tuple<COSObservationType, ushort> DecodeObservationDescriptor(ushort descriptor)
        {
            COSObservationType type = (COSObservationType)(descriptor >> 12);
            ushort id = (ushort) (descriptor & 0xfff);
            return new Tuple<COSObservationType, ushort>(type, id);
        }

        private Tuple<IdentifiedObservation, DataType> DecodeObservationValue(BigEndianReader reader, int observationId, COSObservationType observationType, DateTime timestamp, byte cosHeaderFlags)
        {
            Observation observation = null;
            DataType dataType;
            switch (observationType)
            {
                case COSObservationType.COS_OBS_TYPE_BOOLEAN:
                    byte vBoolean = reader.ReadByte();
                    observation = new BooleanObservation() { Timestamp = timestamp, Value = (vBoolean == 1) };
                    dataType = DataType.Boolean;
                    break;
                case COSObservationType.COS_OBS_TYPE_DOUBLE:
                    double vDouble = reader.ReadDouble();
                    observation = new DoubleObservation() { Timestamp = timestamp, Value = vDouble };
                    dataType = DataType.Double;
                    break;
                case COSObservationType.COS_OBS_TYPE_FLOAT:
                    double vFloat = reader.ReadSingle();
                    observation = new DoubleObservation() { Timestamp = timestamp, Value = vFloat };
                    dataType = DataType.Double;
                    break;
                case COSObservationType.COS_OBS_TYPE_INT32:
                    Int32 vInt32 = reader.ReadInt32();
                    observation = new IntegerObservation() { Timestamp = timestamp, Value = vInt32 };
                    dataType = DataType.Integer;
                    break;
                case COSObservationType.COS_OBS_TYPE_INT16:
                    Int16 vInt16 = reader.ReadInt16();
                    observation = new IntegerObservation() { Timestamp = timestamp, Value = vInt16 };
                    dataType = DataType.Integer;
                    break;
                case COSObservationType.COS_OBS_TYPE_UINT16:
                    UInt16 vUInt16 = reader.ReadUInt16();
                    observation = new IntegerObservation() { Timestamp = timestamp, Value = vUInt16 };
                    dataType = DataType.Integer;
                    break;
                case COSObservationType.COS_OBS_TYPE_INT8:
                    sbyte vInt8 = reader.ReadSByte();
                    observation = new IntegerObservation() { Timestamp = timestamp, Value = vInt8 };
                    dataType = DataType.Integer;
                    break;
                case COSObservationType.COS_OBS_TYPE_UINT8:
                    byte vUInt8 = reader.ReadByte();
                    observation = new IntegerObservation() { Timestamp = timestamp, Value = vUInt8 };
                    dataType = DataType.Integer;
                    break;
                case COSObservationType.COS_OBS_TYPE_POSITION_2D:
                    double vPos2DLat = reader.ReadSingle();
                    double vPos2DLon = reader.ReadSingle();
                    observation = new PositionObservation() { Timestamp = timestamp, Value = new Position() { Latitude = vPos2DLat, Longitude = vPos2DLon } };
                    dataType = DataType.Position;
                    break;
                case COSObservationType.COS_OBS_TYPE_POSITION_3D:
                    double vPos3DLat = reader.ReadSingle();
                    double vPos3DLon = reader.ReadSingle();
                    double vPos3DAlt = reader.ReadSingle();
                    observation = new PositionObservation() { Timestamp = timestamp, Value = new Position() { Latitude = vPos3DLat, Longitude = vPos3DLon, Altitude = vPos3DAlt } };
                    dataType = DataType.Position;
                    break;
                case COSObservationType.COS_OBS_TYPE_ASCII:
                    ushort vAsciiLength = reader.ReadUInt16();
                    char[] vAscii = (char[]) reader.ReadChars(vAsciiLength);
                    observation = new StringObservation() { Timestamp = timestamp, Value = new string(vAscii) };
                    dataType = DataType.String;
                    break;
                case COSObservationType.COS_OBS_TYPE_UTF8:
                    ushort vUTF8Length = reader.ReadUInt16();
                    byte[] vUTF8 = reader.ReadBytes(vUTF8Length);
                    observation = new StringObservation() { Timestamp = timestamp, Value = Encoding.UTF8.GetString(vUTF8) };
                    dataType = DataType.String;
                    break;
                case COSObservationType.COS_OBS_TYPE_BINARY:
                    Int32 vBinLength = reader.ReadInt32();
                    byte[] vBin = reader.ReadBytes(vBinLength);
                    observation = new BinaryObservation() { Timestamp = timestamp, Value = vBin };
                    dataType = DataType.Binary;
                    break;
                case COSObservationType.COS_OBS_TYPE_STATISTICS:
                    byte vStatFlags = reader.ReadByte();
                    DescriptiveStatistics vStat = new DescriptiveStatistics();
                    vStat.Count = reader.ReadInt32();
                    vStat.Mean = reader.ReadDouble();
                    vStat.Minimum = reader.ReadDouble();
                    vStat.Maximum = reader.ReadDouble();
                    if ((vStatFlags & (byte)COSStatisticsFlag.COS_STATISTICS_HAS_TIMERANGE) != 0)
                    {
                        vStat.From = DeserializeTimestamp(reader, cosHeaderFlags);
                        vStat.To = DeserializeTimestamp(reader, cosHeaderFlags);
                    }
                    if ((vStatFlags & (byte)COSStatisticsFlag.COS_STATISTICS_HAS_STDDEV) != 0)
                    {
                        vStat.StdDev = reader.ReadDouble();
                    }
                    if ((vStatFlags & (byte)COSStatisticsFlag.COS_STATISTICS_HAS_MEDIAN) != 0)
                    {
                        vStat.Median = reader.ReadDouble();
                    }
                    observation = new StatisticsObservation() { Timestamp = timestamp, Value = vStat };
                    dataType = DataType.Statistics;
                    break;
                default:
                    throw new ArgumentException($"Unsupported observation type value: {observationType}.");
            }
            IdentifiedObservation io = new IdentifiedObservation()
            {
                ObservationId = observationId,
                Observation = observation
            };
            return new Tuple<IdentifiedObservation, DataType>(io, dataType);
        }
        #endregion
    }
}
