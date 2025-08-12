using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using Masterloop.Core.Types.Base;
using Masterloop.Core.Types.Observations;

namespace Masterloop.Cloud.Storage.Codecs
{
    /// <summary>
    /// Basic implementation of COSWriter.
    /// Note: This implementation is very basic, and is not byte efficient. It will allocate one section per observation.
    /// </summary>
    public class COSWriter
    {
        private List<Tuple<IdentifiedObservation, DataType>> _observations;

        public COSWriter()
        {
            _observations = new List<Tuple<IdentifiedObservation, DataType>>();
        }

        public void AddObservation(IdentifiedObservation observation, DataType dataType)
        {
            _observations.Add(new Tuple<IdentifiedObservation, DataType>(observation, dataType));
        }

        public void Clear()
        {
            _observations.Clear();
        }

        public byte[] Serialize(byte version, byte cosHeaderFlags)
        {
            if ((cosHeaderFlags & (byte)COSHeaderFlag.COS_HEADER_MULTI_OBSERVATIONS) != 0)
            {
                throw new ArgumentException("cosHeaderFlags not supported: COS_HEADER_MULTI_OBSERVATIONS");
            }
            if ((cosHeaderFlags & (byte)COSHeaderFlag.COS_HEADER_MULTI_TIMESTAMPS) != 0)
            {
                throw new ArgumentException("cosHeaderFlags not supported: COS_HEADER_MULTI_TIMESTAMPS");
            }


            using (MemoryStream stream = new MemoryStream())
            {
                using (BigEndianWriter writer = new BigEndianWriter(new BinaryWriter(stream)))
                {
                    // Serialize _observations into cos.
                    writer.WriteByte(version);
                    switch (version)
                    {
                        case 1:
                        case 2:
                            SerializeCOS(writer, cosHeaderFlags, version);
                            break;
                        default:
                            throw new Exception($"Unsupported COS version: {version}");
                    }
                }

                return stream.ToArray();
            }
        }

        private void SerializeCOS(BigEndianWriter writer, byte cosHeaderFlags, byte version)
        {
            writer.WriteByte((byte)cosHeaderFlags);

            // One section per observation (basic implementation)
            ushort sectionCount = (ushort) _observations.Count;
            writer.WriteUInt16(sectionCount);

            //TODO: Group all observations of same Id into one section. Use 64 bit timestamps with delta time in section. Limit sections to maximum 65536 items (start new sections if needed).

            // Write sections
            foreach (Tuple<IdentifiedObservation, DataType> item in _observations)
            {
                IdentifiedObservation io = item.Item1;
                DataType dataType = item.Item2;
                COSObservationType cosObsType;
                if (version == 1)
                {
                    cosObsType = EncodeObservationValue1(io, dataType, null);
                }
                else if (version == 2)
                {
                    cosObsType = EncodeObservationValue2(io, dataType, null, cosHeaderFlags);
                }
                else
                {
                    throw new ArgumentException($"Unsupported COS version: {version}");
                }

                // Write observation descriptor
                ushort descriptor = EncodeObservationDescriptor(cosObsType, (ushort) io.ObservationId);
                writer.WriteUInt16(descriptor);

                // Write observation timestamp
                SerializeTimestamp(cosHeaderFlags, io.Observation.Timestamp, writer);

                // One observation per section.
                writer.WriteUInt16(1);

                // Write observation value
                if (version == 1)
                {
                    EncodeObservationValue1(io, dataType, writer);
                }
                else if (version == 2)
                {
                    EncodeObservationValue2(io, dataType, writer, cosHeaderFlags);
                }
                else
                {
                    throw new ArgumentException($"Unsupported COS version: {version}");
                }
            }
        }

        protected ushort EncodeObservationDescriptor(COSObservationType observationType, ushort observationId)
        {
            return (ushort)((ushort)(observationType) << 12 | observationId & 0xfff);
        }

        protected void SerializeTimestamp(byte cosHeaderFlags, DateTime t, BigEndianWriter writer)
        {
            // Write observation timestamp
            if ((cosHeaderFlags & (byte)COSHeaderFlag.COS_HEADER_64BIT_TIMESTAMPS) != 0)
            {
                writer.WriteInt64(t.Ticks);
            }
            else
            {
                TimeSpan unixTime = t - new DateTime(1970, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc);
                writer.WriteUInt32((UInt32)unixTime.TotalSeconds);
            }
        }

        protected COSObservationType EncodeObservationValue1(IdentifiedObservation observation, DataType dataType, BigEndianWriter writer)
        {
            switch (dataType)
            {
                case DataType.Boolean:
                    BooleanObservation v2 = observation.Observation as BooleanObservation;
                    if (writer != null) writer.WriteByte((byte)(v2.Value ? 1 : 0));
                    return COSObservationType.COS_OBS_TYPE_BOOLEAN;
                case DataType.Double:
                    DoubleObservation v3 = observation.Observation as DoubleObservation;
                    if (writer != null) writer.WriteDouble(v3.Value);
                    return COSObservationType.COS_OBS_TYPE_DOUBLE;
                case DataType.Integer:
                    IntegerObservation v4 = observation.Observation as IntegerObservation;
                    if (v4.Value >= -128 && v4.Value <= 127)
                    {
                        if (writer != null) writer.WriteSByte((sbyte)v4.Value);
                        return COSObservationType.COS_OBS_TYPE_INT8;
                    }
                    else if (v4.Value >= 0 && v4.Value <= 255)
                    {
                        if (writer != null) writer.WriteByte((byte)v4.Value);
                        return COSObservationType.COS_OBS_TYPE_UINT8;
                    }
                    else if (v4.Value >= -32768 && v4.Value <= 32767)
                    {
                        if (writer != null) writer.WriteInt16((short)v4.Value);
                        return COSObservationType.COS_OBS_TYPE_INT16;
                    }
                    else if (v4.Value >= 0 && v4.Value <= 65535)
                    {
                        if (writer != null) writer.WriteUInt16((ushort)v4.Value);
                        return COSObservationType.COS_OBS_TYPE_UINT16;
                    }
                    else
                    {
                        if (writer != null) writer.WriteInt32(v4.Value);
                        return COSObservationType.COS_OBS_TYPE_INT32;
                    }
                case DataType.Position:
                    PositionObservation v5 = observation.Observation as PositionObservation;
                    if (writer != null) writer.WriteSingle((float)v5.Value.Latitude);
                    if (writer != null) writer.WriteSingle((float)v5.Value.Longitude);
                    if (writer != null) writer.WriteSingle((float)v5.Value.Altitude);
                    return COSObservationType.COS_OBS_TYPE_POSITION_3D;
                case DataType.String:
                    StringObservation v6 = observation.Observation as StringObservation;
                    byte[] utf8 = Encoding.UTF8.GetBytes(v6.Value);
                    if (writer != null) writer.WriteUInt16((ushort)utf8.Length);
                    if (writer != null) writer.WriteBytes(utf8);
                    return COSObservationType.COS_OBS_TYPE_UTF8;
                default:
                    throw new ArgumentException($"Unsupported observation datatype in COS v1: {dataType}.");
            }
        }

        protected COSObservationType EncodeObservationValue2(IdentifiedObservation observation, DataType dataType, BigEndianWriter writer, byte cosHeaderFlags)
        {
            switch (dataType)
            {
                case DataType.Boolean:
                case DataType.Double:
                case DataType.Integer:
                case DataType.Position:
                case DataType.String:
                    return EncodeObservationValue1(observation, dataType, writer);
                case DataType.Binary:
                    BinaryObservation v1 = observation.Observation as BinaryObservation;
                    if (writer != null) writer.WriteInt32(v1.Value.Length);
                    if (writer != null) writer.WriteBytes(v1.Value);
                    return COSObservationType.COS_OBS_TYPE_BINARY;
                case DataType.Statistics:
                    StatisticsObservation v7 = observation.Observation as StatisticsObservation;
                    byte statFlags = 0;
                    if (v7.Value.From.HasValue && v7.Value.To.HasValue) statFlags |= (byte) COSStatisticsFlag.COS_STATISTICS_HAS_TIMERANGE;
                    if (v7.Value.StdDev.HasValue) statFlags |= (byte)COSStatisticsFlag.COS_STATISTICS_HAS_STDDEV;
                    if (v7.Value.Median.HasValue) statFlags |= (byte)COSStatisticsFlag.COS_STATISTICS_HAS_MEDIAN;
                    if (writer != null) writer.WriteByte(statFlags);
                    if (writer != null) writer.WriteInt32(v7.Value.Count);
                    if (writer != null) writer.WriteDouble(v7.Value.Mean);
                    if (writer != null) writer.WriteDouble(v7.Value.Minimum);
                    if (writer != null) writer.WriteDouble(v7.Value.Maximum);
                    if ((statFlags & (byte)COSStatisticsFlag.COS_STATISTICS_HAS_TIMERANGE) != 0)
                    {
                        if (writer != null) SerializeTimestamp(cosHeaderFlags, v7.Value.From.Value, writer);
                        if (writer != null) SerializeTimestamp(cosHeaderFlags, v7.Value.To.Value, writer);
                    }
                    if ((statFlags & (byte)COSStatisticsFlag.COS_STATISTICS_HAS_STDDEV) != 0)
                    {
                        if (writer != null) writer.WriteDouble(v7.Value.StdDev.Value);
                    }
                    if ((statFlags & (byte)COSStatisticsFlag.COS_STATISTICS_HAS_MEDIAN) != 0)
                    {
                        if (writer != null) writer.WriteDouble(v7.Value.Median.Value);
                    }
                    return COSObservationType.COS_OBS_TYPE_STATISTICS;
                default:
                    throw new ArgumentException($"Unsupported observation datatype in COS v2: {dataType}.");
            }
        }
    }
}