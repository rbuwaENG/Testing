using System;
using System.Linq;
using System.Text;
using Masterloop.Cloud.Storage.Codecs;
using Masterloop.Core.Types.Base;
using Masterloop.Core.Types.Observations;


namespace Masterloop.Tools.TestTool
{
    public class COSTester
    {
        public static bool DecodeBase64HexString(string hexString)
        {
            try
            {
                byte[] encodedBytes = StringToByteArray(hexString.Replace("-", ""));
                byte[] decoded = ForgivingBase64Decode(encodedBytes);
                COSReader reader = new COSReader();
                reader.Open(decoded);
                return true;
            }
            catch(Exception)
            {
                return false;
            }
        }

        public static byte[] StringToByteArray(string hex)
        {
            return Enumerable.Range(0, hex.Length)
                             .Where(x => x % 2 == 0)
                             .Select(x => Convert.ToByte(hex.Substring(x, 2), 16))
                             .ToArray();
        }

        private static byte[] ForgivingBase64Decode(in byte[] b64Data)
        {
            byte[] decodedData;
            int length = b64Data.Length;
            if (((length % 3) == 0 || b64Data[length - 1] == (byte)0x3d) && DecodeBase64(b64Data, length, out decodedData))
            {
                return decodedData;
            }
            else
            {
                if (b64Data.Contains((byte)0x3d))  // = -> Padding detected, remove all after first padding group.
                {
                    bool found = false;
                    for (int i = 0; i < b64Data.Length; i++)
                    {
                        if (b64Data[i] == (byte)0x3d)
                        {
                            found = true;
                        }
                        if (found && b64Data[i] != (byte)0x3d)
                        {
                            if (DecodeBase64(b64Data, i, out decodedData))
                            {
                                return decodedData;
                            }
                            else
                            {
                                throw new Exception("Base64 decoding failed, even after removing bytes after last padding character.");
                            }
                        }
                    }
                    throw new Exception("Base64 decoding failed, unexpected end of padding removal.");
                }
                else
                {
                    // Remove one and one byte until it is a multiple of 3 and can be decoded or we run out of space.
                    while (length > 3)
                    {
                        length--;
                        if ((length % 3) == 0 && DecodeBase64(b64Data, length, out decodedData))
                        {
                            return decodedData;
                        }
                    }
                    throw new Exception("Base64 decoding failed, even after removing bytes from the end until nothing was left.");
                }
            }
        }

        private static bool DecodeBase64(in byte[] b64Data, int length, out byte[] decodedData)
        {
            try
            {
                string encodedString = Encoding.UTF8.GetString(b64Data, 0, length);
                decodedData = Convert.FromBase64String(encodedString);
                return true;
            }
            catch (Exception)
            {
                decodedData = null;
                return false;
            }
        }

        public static void RunV1()
        {
            COSWriter writer = new COSWriter();

            writer.AddObservation(
                new IdentifiedObservation()
                {
                    ObservationId = 2,
                    Observation = new BooleanObservation()
                    {
                        Timestamp = DateTime.UtcNow,
                        Value = true
                    }
                }, DataType.Boolean);

            writer.AddObservation(
                new IdentifiedObservation()
                {
                    ObservationId = 3,
                    Observation = new DoubleObservation()
                    {
                        Timestamp = DateTime.UtcNow,
                        Value = 1.2345
                    }
                }, DataType.Double);

            writer.AddObservation(
                new IdentifiedObservation()
                {
                    ObservationId = 4,
                    Observation = new IntegerObservation()
                    {
                        Timestamp = DateTime.UtcNow,
                        Value = 42
                    }
                }, DataType.Integer);

            writer.AddObservation(
                new IdentifiedObservation()
                {
                    ObservationId = 5,
                    Observation = new PositionObservation()
                    {
                        Timestamp = DateTime.UtcNow,
                        Value = new Position() { Latitude = 58.9317646, Longitude = 5.7055556, Altitude = 17.62 }
                    }
                }, DataType.Position);
            writer.AddObservation(
                new IdentifiedObservation()
                {
                    ObservationId = 6,
                    Observation = new StringObservation()
                    {
                        Timestamp = DateTime.UtcNow,
                        Value = "Hello, World"
                    }
                }, DataType.String);

            byte[] cosData = writer.Serialize(1, (byte)COSHeaderFlag.COS_HEADER_64BIT_TIMESTAMPS);

            COSReader reader = new COSReader();
            reader.Open(cosData);
            for (int i = 0; i < reader.GetNumberOfObservations(); i++)
            {
                IdentifiedObservation io = reader.GetObservation(i);
                DataType dataType = reader.GetDataType(i);

                Console.WriteLine($"[{i}]");
                Console.WriteLine($"  Id={io.ObservationId}");
                Console.WriteLine($"  Type={dataType}");
                Console.WriteLine($"  Timestamp={io.Observation.Timestamp}");
                switch (dataType)
                {
                    case DataType.Boolean: Console.WriteLine($"  Value={((BooleanObservation)io.Observation).Value}"); break;
                    case DataType.Double: Console.WriteLine($"  Value={((DoubleObservation)io.Observation).Value}"); break;
                    case DataType.Integer: Console.WriteLine($"  Value={((IntegerObservation)io.Observation).Value}"); break;
                    case DataType.Position: Console.WriteLine($"  Value={Masterloop.Core.Types.Base.DataTypeStringConverter.FormatPosition(((PositionObservation)io.Observation).Value)}"); break;
                    case DataType.String: Console.WriteLine($"  Value={((StringObservation)io.Observation).Value}"); break;
                }
            }
        }

        public static void RunV2()
        {
            COSWriter writer = new COSWriter();

            writer.AddObservation(
                new IdentifiedObservation()
                {
                    ObservationId = 1,
                    Observation = new BinaryObservation()
                    {
                        Timestamp = DateTime.UtcNow,
                        Value = new byte[] { 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15 }
                    }
                }, DataType.Binary);

            writer.AddObservation(
                new IdentifiedObservation()
                {
                    ObservationId = 2,
                    Observation = new BooleanObservation()
                    {
                        Timestamp = DateTime.UtcNow,
                        Value = true
                    }
                }, DataType.Boolean);

            writer.AddObservation(
                new IdentifiedObservation()
                {
                    ObservationId = 3,
                    Observation = new DoubleObservation()
                    {
                        Timestamp = DateTime.UtcNow,
                        Value = 1.2345
                    }
                }, DataType.Double);

            writer.AddObservation(
                new IdentifiedObservation()
                {
                    ObservationId = 4,
                    Observation = new IntegerObservation()
                    {
                        Timestamp = DateTime.UtcNow,
                        Value = 42
                    }
                }, DataType.Integer);

            writer.AddObservation(
                new IdentifiedObservation()
                {
                    ObservationId = 5,
                    Observation = new PositionObservation()
                    {
                        Timestamp = DateTime.UtcNow,
                        Value = new Position() { Latitude = 58.9317646, Longitude = 5.7055556, Altitude = 17.62 }
                    }
                }, DataType.Position);
            writer.AddObservation(
                new IdentifiedObservation()
                {
                    ObservationId = 6,
                    Observation = new StringObservation()
                    {
                        Timestamp = DateTime.UtcNow,
                        Value = "Hello, World"
                    }
                }, DataType.String);

            writer.AddObservation(
                new IdentifiedObservation()
                {
                    ObservationId = 7,
                    Observation = new StatisticsObservation()
                    {
                        Timestamp = DateTime.UtcNow,
                        Value = new DescriptiveStatistics() { Count = 42, Mean = 1.24, Minimum = 1.0, Maximum = 2.0, Median = 1.5, StdDev = 0.1, From = DateTime.UtcNow.AddHours(-6), To = DateTime.UtcNow }
                    }
                }, DataType.Statistics);

            byte[] cosData = writer.Serialize(2, (byte)COSHeaderFlag.COS_HEADER_64BIT_TIMESTAMPS);

            COSReader reader = new COSReader();
            reader.Open(cosData);
            for (int i = 0; i < reader.GetNumberOfObservations(); i++)
            {
                IdentifiedObservation io = reader.GetObservation(i);
                DataType dataType = reader.GetDataType(i);

                Console.WriteLine($"[{i}]");
                Console.WriteLine($"  Id={io.ObservationId}");
                Console.WriteLine($"  Type={dataType}");
                Console.WriteLine($"  Timestamp={io.Observation.Timestamp}");
                switch (dataType)
                {
                    case DataType.Binary: Console.WriteLine($"  Value={DataTypeStringConverter.FormatBinary(((BinaryObservation)io.Observation).Value)}"); break;
                    case DataType.Boolean: Console.WriteLine($"  Value={DataTypeStringConverter.FormatBoolean(((BooleanObservation)io.Observation).Value)}"); break;
                    case DataType.Double: Console.WriteLine($"  Value={DataTypeStringConverter.FormatDouble(((DoubleObservation)io.Observation).Value)}"); break;
                    case DataType.Integer: Console.WriteLine($"  Value={DataTypeStringConverter.FormatInteger(((IntegerObservation)io.Observation).Value)}"); break;
                    case DataType.Position: Console.WriteLine($"  Value={DataTypeStringConverter.FormatPosition(((PositionObservation)io.Observation).Value)}"); break;
                    case DataType.String: Console.WriteLine($"  Value={((StringObservation)io.Observation).Value}"); break;
                    case DataType.Statistics: Console.WriteLine($"  Value={DataTypeStringConverter.FormatStatistics(((StatisticsObservation)io.Observation).Value)}"); break;
                }
            }
        }
    }
}
