using Masterloop.Core.Types.Base;
using Masterloop.Core.Types.Commands;
using Masterloop.Core.Types.Devices;
using Masterloop.Core.Types.DevSync;
using Masterloop.Core.Types.Observations;
using Masterloop.Core.Types.Settings;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;

namespace Masterloop.Cloud.Storage.Codecs
{
    public class DevSyncBinary
    {
        private static byte[] RequestIdentifier = { 0x4D, 0x44, 0x52, 0x51 };
        private static byte[] ResponseIdentifier = { 0x4D, 0x44, 0x52, 0x53 };

        public static DevSyncRequest DecodeRequest(byte[] request, DeviceTemplate template)
        {
            using (MemoryStream stream = new MemoryStream(request))
            {
                using (BigEndianReader reader = new BigEndianReader(new BinaryReader(stream)))
                {
                    // Read Header
                    byte[] identifier = reader.ReadBytes(4);
                    if (!RequestIdentifier.SequenceEqual(identifier)) throw new InvalidDataException("Identifier differs from \"MDRQ\".");
                    UInt16 version = reader.ReadUInt16();
                    if (version == 3)
                    {
                        return ReadVersion2Request(reader, template);
                    }
                    else
                    {
                        throw new Exception("Unsupported DevSync binary version: " + version);
                    }
                }
            }
        }

        public static byte[] EncodeRequest(DevSyncRequest request, UInt16 version, DeviceTemplate template)
        {
            using (MemoryStream stream = new MemoryStream())
            {
                using (BigEndianWriter writer = new BigEndianWriter(new BinaryWriter(stream)))
                {
                    // Write Header
                    writer.WriteBytes(RequestIdentifier);
                    writer.WriteUInt16(version);
                    if (version == 3)
                    {
                        return WriteVersion2Request(request, writer, template);
                    }
                    else
                    {
                        throw new Exception("Unsupported DevSync binary version: " + version);
                    }
                }
            }
        }

        private static byte[] WriteVersion2Request(DevSyncRequest request, BigEndianWriter writer, DeviceTemplate template)
        {
            throw new NotImplementedException();
            // Rest of header
/*            writer.WriteUInt32(0); // Placeholder, to be updated later
            writer.WriteUInt32(0); // Placeholder, to be updated later
            writer.WriteUInt32(0); // Placeholder, to be updated later
            writer.WriteUInt32(0); // Placeholder, to be updated later
            writer.WriteUInt32(0); // Placeholder, to be updated later
            writer.WriteUInt16(0); // Placeholder, to be updated later
            writer.WriteByte(0);   // Placeholder, to be updated later

            // Observations
            UInt32 obsOffset = (UInt32)writer.BaseStream.Position;
            if (request.Observations != null && request.Observations.Length > 0)
            {
                Dictionary<int, DataType> observationDataType = template.Observations.ToDictionary(o => o.Id, o => o.DataType);
                CompactObservationPackage cop = new CompactObservationPackage(request.Observations, observationDataType);
                UInt32 noObservations = cop.Package.GetTotalObservations();
                writer.WriteUInt32(noObservations);

            }
            else
            {
                writer.WriteUInt32(0);  // No observations
            }*/
        }

        private static DevSyncRequest ReadVersion2Request(BigEndianReader reader, DeviceTemplate template)
        {
            // Rest of header
            UInt32 curSet = reader.ReadUInt32();
            DateTime currentSettings = ParseBinaryDateTime(curSet);
            Int32 fwReleaseId = reader.ReadInt32();
            bool fwUseDelta = reader.ReadByte() == 1;

            // Observations
            ObservationPackageBuilder observations = new ObservationPackageBuilder();
            bool observationsCompleted = false;
            while (!observationsCompleted)
            {
                UInt16 obsId = reader.ReadUInt16();
                UInt32 ts = reader.ReadUInt32();
                if (obsId == 0)
                {
                    // Observation Id = 0 marks the end of observations (assume datatype to boolean to complete cycle)
                    observationsCompleted = true;
                    reader.ReadByte();
                }
                else if (template.Observations.Any(o => o.Id == obsId))
                {
                    DateTime timestamp = ts == 0 ? DateTime.UtcNow : ParseBinaryDateTime(ts);
                    DeviceObservation devObs = template.Observations.Where(o => o.Id == obsId).First();
                    switch (devObs.DataType)
                    {
                        case DataType.Boolean:
                            bool boolValue = (reader.ReadByte() == 1);
                            observations.Append(new IdentifiedObservation() { ObservationId = obsId, Observation = new BooleanObservation() { Timestamp = timestamp, Value = boolValue } });
                            break;
                        case DataType.Double:
                            double dblValue = reader.ReadSingle();  // Doubles are represented as singles in the binary file.
                            observations.Append(new IdentifiedObservation() { ObservationId = obsId, Observation = new DoubleObservation() { Timestamp = timestamp, Value = dblValue } });
                            break;
                        case DataType.Integer:
                            Int32 intValue = reader.ReadInt32();
                            observations.Append(new IdentifiedObservation() { ObservationId = obsId, Observation = new IntegerObservation() { Timestamp = timestamp, Value = intValue } });
                            break;
                        case DataType.Position:
                            double lat = reader.ReadSingle();
                            double lon = reader.ReadSingle();
                            double alt = reader.ReadSingle();
                            Position posValue = new Position()
                            {
                                Latitude = lat,
                                Longitude = lon,
                                Altitude = alt
                            };
                            observations.Append(new IdentifiedObservation() { ObservationId = obsId, Observation = new PositionObservation() { Timestamp = timestamp, Value = posValue } });
                            break;
                        case DataType.String:
                            UInt16 slen = reader.ReadUInt16();
                            if (slen > 0)
                            {
                                byte[] ascii = reader.ReadBytes(slen);
                                string strValue = System.Text.Encoding.UTF8.GetString(ascii);
                                observations.Append(new IdentifiedObservation() { ObservationId = obsId, Observation = new StringObservation() { Timestamp = timestamp, Value = strValue } });
                            }
                            break;
                    }
                }
                else
                {
                    throw new ArgumentException("Unknown observation identifier: " + obsId.ToString());
                }
            }

            // Command Responses
            List<CommandResponse> commandResponses = new List<CommandResponse>();
            bool commandResponsesCompleted = false;
            while (!commandResponsesCompleted)
            {
                UInt16 id = reader.ReadUInt16();
                UInt32 ts = reader.ReadUInt32();
                DateTime timestamp = ParseBinaryDateTime(ts);
                UInt32 dats = reader.ReadUInt32();
                DateTime deliveredAt = dats == 0 ? DateTime.UtcNow : ParseBinaryDateTime(dats);
                bool wasAccepted = reader.ReadByte() == 1;
                if (id == 0)
                {
                    commandResponsesCompleted = true;
                }
                else
                {
                    CommandResponse commandResponse = new CommandResponse()
                    {
                        Id = id,
                        Timestamp = timestamp,
                        DeliveredAt = deliveredAt,
                        WasAccepted = wasAccepted
                    };
                    commandResponses.Add(commandResponse);
                }
            }

            // Create DevSyncRequest blob and return it.
            CompactObservationPackage cop = new CompactObservationPackage(observations.GetAsObservationPackage());
            DevSyncRequest request = new DevSyncRequest()
            {
                Observations = cop.ToString(),
                CommandResponses = commandResponses.ToArray(),
                SettingsTimestamp = currentSettings.ToString("o"),
                FirmwareUseDeltaPatching = fwUseDelta,
                FirmwareReleaseId = fwReleaseId
            };
            return request;
        }

        public static byte[] EncodeResponse(DevSyncResponse response, UInt16 version, DeviceTemplate template)
        {
            using (MemoryStream stream = new MemoryStream())
            {
                using (BigEndianWriter writer = new BigEndianWriter(new BinaryWriter(stream)))
                {
                    // Write Header
                    writer.WriteBytes(ResponseIdentifier);
                    writer.WriteUInt16(version);
                    if (version == 3)
                    {
                        WriteVersion2Response(response, writer, template);
                        stream.Seek(0, SeekOrigin.End);
                        stream.Flush();
                        return stream.ToArray();
                    }
                    else
                    {
                        throw new Exception("Unsupported DevSync binary version: " + version);
                    }
                }
            }
        }

        private static void WriteVersion2Response(DevSyncResponse response, BigEndianWriter writer, DeviceTemplate template)
        {
            // Rest of header
            writer.WriteUInt32(0); // Placeholder, to be updated later
            writer.WriteUInt32(0); // Placeholder, to be updated later
            writer.WriteUInt32(0); // Placeholder, to be updated later
            writer.WriteUInt32(0); // Placeholder, to be updated later
            writer.WriteByte(0);   // Placeholder, to be updated later
            writer.WriteUInt32(0); // Placeholder, to be updated later
            writer.WriteUInt32(0); // Placeholder, to be updated later
            writer.WriteUInt32(0); // Placeholder, to be updated later

            // Settings
            UInt32 setOffset = (UInt32)(writer.BaseStream.Position);
            if (response.Settings != null && response.Settings.Values != null && response.Settings.Values.Length > 0)
            {
                UInt32 lastUpdatedOn = FormatBinaryDateTime(response.Settings.LastUpdatedOn);
                writer.WriteUInt32(lastUpdatedOn);
                UInt32 noSettingValues = (UInt32)response.Settings.Values.Where(s => s.Value != null).Count();
                writer.WriteUInt32(noSettingValues);
                foreach (ExpandedSettingValue setting in response.Settings.Values.Where(s => s.Value != null))
                {
                    UInt16 id = (UInt16)setting.Id;
                    writer.WriteUInt16(id);
                    writer.WriteByte((byte)setting.DataType);
                    WriteValue(writer, setting.Value, setting.DataType);
                }
            }
            UInt32 setLength = (UInt32)(writer.BaseStream.Position) - setOffset;

            // Commands
            UInt32 cmdOffset = (UInt32)writer.BaseStream.Position;
            if (response.Commands != null && response.Commands.Length > 0)
            {
                UInt32 noCommands = (UInt32) response.Commands.Length;
                writer.WriteUInt32(noCommands);
                foreach (Command command in response.Commands)
                {
                    UInt16 id = (UInt16) command.Id;
                    writer.WriteUInt16(id);
                    UInt32 ts = FormatBinaryDateTime(command.Timestamp);
                    writer.WriteUInt32(ts);
                    UInt32 exp = command.ExpiresAt.HasValue ? FormatBinaryDateTime(command.ExpiresAt.Value) : 0;
                    writer.WriteUInt32(exp);
                    UInt16 noArgValues = (UInt16)(command.Arguments == null ? 0 : command.Arguments.Length);
                    writer.WriteUInt16(noArgValues);
                    if (command.Arguments != null)
                    {
                        foreach (CommandArgument ca in command.Arguments)
                        {
                            UInt16 caId = (UInt16)ca.Id;
                            writer.WriteUInt16(caId);
                            if (ca.Value != null && ca.Value.Length > 0)
                            {
                                writer.WriteByte((byte)ca.Value.Length);
                                writer.WriteBytes(Encoding.UTF8.GetBytes(ca.Value));
                            }
                            else
                            {
                                writer.WriteByte(0);
                            }
                        }
                    }
                }
            }
            UInt32 cmdLength = (UInt32)(writer.BaseStream.Position) - cmdOffset;

            // Firmware
            UInt32 fwOffset = (UInt32)(writer.BaseStream.Position);
            byte fwType = 0;
            if (response.FirmwarePatchMetadata != null && response.FirmwareBlob != null)  // If patching is  used, write patch metadata+data.
            {
                fwType = 1;
                writer.WriteUInt16((UInt16)response.FirmwarePatchMetadata.FromFirmwareReleaseId);
                writer.WriteUInt16((UInt16)response.FirmwarePatchMetadata.ToFirmwareReleaseId);
                writer.WriteUInt32(FormatBinaryDateTime(response.FirmwarePatchMetadata.ReleaseDate));
                writer.WriteUInt16((UInt16)response.FirmwarePatchMetadata.Encoding.Length);
                writer.WriteBytes(Encoding.UTF8.GetBytes(response.FirmwarePatchMetadata.Encoding));
                byte[] firmwareMD5 = Convert.FromBase64String(response.FirmwarePatchMetadata.FirmwareMD5);
                writer.WriteByte((byte)firmwareMD5.Length);
                writer.WriteBytes(firmwareMD5);
                byte[] patchMD5 = Convert.FromBase64String(response.FirmwarePatchMetadata.PatchMD5);
                writer.WriteByte((byte)patchMD5.Length);
                writer.WriteBytes(patchMD5);
                byte[] firmwareBlob = Convert.FromBase64String(response.FirmwareBlob);
                writer.WriteUInt32((UInt32)firmwareBlob.Length);
                writer.WriteBytes(firmwareBlob);
            }
            else if (response.FirmwareReleaseMetadata != null && response.FirmwareBlob != null)  // If full release is used, write release metadata+data.
            {
                fwType = 2;
                writer.WriteUInt16((UInt16)response.FirmwareReleaseMetadata.Id);
                writer.WriteUInt32(FormatBinaryDateTime(response.FirmwareReleaseMetadata.ReleaseDate));
                byte[] firmwareMD5 = Convert.FromBase64String(response.FirmwareReleaseMetadata.FirmwareMD5);
                writer.WriteByte((byte)firmwareMD5.Length);
                writer.WriteBytes(firmwareMD5);
                byte[] firmwareBlob = Convert.FromBase64String(response.FirmwareBlob);
                writer.WriteUInt32((UInt32)firmwareBlob.Length);
                writer.WriteBytes(firmwareBlob);
            }
            UInt32 fwLength = (UInt32)(writer.BaseStream.Position) - fwOffset;

            // Update header
            writer.BaseStream.Seek(6, SeekOrigin.Begin);
            writer.WriteUInt32(setOffset);
            writer.WriteUInt32(setLength);
            writer.WriteUInt32(cmdOffset);
            writer.WriteUInt32(cmdLength);
            writer.WriteByte(fwType);
            writer.WriteUInt32(fwOffset);
            writer.WriteUInt32(fwLength);
            UInt32 serverTime = FormatBinaryDateTime(DateTime.UtcNow);
            writer.WriteUInt32(serverTime);  // Get and encode server time as close to dispatch as possible.
        }

        private static DateTime ParseBinaryDateTime(UInt32 ts)
        {
            return new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddSeconds(ts);
        }

        private static UInt32 FormatBinaryDateTime(DateTime dt)
        {
            DateTime epoch = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            TimeSpan span = dt - epoch;
            if (span.TotalSeconds > 0 && span.TotalSeconds < UInt32.MaxValue)
            {
                return (UInt32)(span.TotalSeconds);
            }
            else
            {
                throw new ArgumentException("DateTime object out of range: " + dt.ToString("o"));
            }
        }

        private static void WriteValue(BigEndianWriter writer, string strValue, DataType dataType)
        {
            switch (dataType)
            {
                case DataType.Boolean:
                    bool vBool = DataTypeStringConverter.ParseBooleanValue(strValue);
                    writer.WriteByte((byte)(vBool ? 0x1 : 0x0));
                    break;
                case DataType.Double:
                    Single vSgl = (Single) DataTypeStringConverter.ParseDoubleValue(strValue);
                    writer.WriteSingle(vSgl);
                    break;
                case DataType.Integer:
                    Int32 vInt = DataTypeStringConverter.ParseIntegerValue(strValue);
                    writer.WriteInt32(vInt);
                    break;
                case DataType.Position:
                    Position vPos = DataTypeStringConverter.ParsePositionValue(strValue);
                    writer.WriteSingle((float)vPos.Latitude);
                    writer.WriteSingle((float)vPos.Longitude);
                    writer.WriteSingle((float)vPos.Altitude);
                    break;
                case DataType.String:
                    if (strValue.Length > 0 && strValue.Length < 256)
                    {
                        writer.WriteByte((byte)strValue.Length);
                        byte[] bytes = Encoding.UTF8.GetBytes(strValue);
                        writer.WriteBytes(bytes);
                    }
                    else
                    {
                        writer.WriteByte(0);
                    }
                    break;
                default:
                    throw new InvalidDataException("Unknown datatype in DevSyncBinary/WriteValue: " + dataType.ToString());
            }
        }
    }
}
