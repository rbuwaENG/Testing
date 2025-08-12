using System;
using System.IO;
using System.Linq;
using System.Text;
using Masterloop.Core.Types.Devices;

namespace Masterloop.Cloud.Storage.Codecs
{
    public class Devicelets
    {
        public static byte[] WriteBinary(DetailedDevice[] devices)
        {
            using (MemoryStream stream = new MemoryStream())
            {
                using (BigEndianWriter writer = new BigEndianWriter(new BinaryWriter(stream)))
                {
                    if (devices == null || devices.Length == 0)
                    {
                        writer.WriteByte((byte)1);
                        writer.WriteUInt32(0);
                    }
                    else
                    {
                        var groupedDevices = devices.GroupBy(d => d.TemplateId);
                        writer.WriteByte((byte)1);
                        writer.WriteUInt32((UInt32)groupedDevices.Count());
                        foreach (var deviceGroup in groupedDevices.OrderBy(g => g.Key))
                        {
                            byte[] templateName = Encoding.UTF8.GetBytes(deviceGroup.Key);
                            writer.WriteByte((byte)templateName.Length);
                            writer.WriteBytes(templateName);
                            writer.WriteUInt32((UInt32)deviceGroup.Count());
                            foreach (var device in deviceGroup.OrderBy(d => d.MID))
                            {
                                byte[] deviceMID = Encoding.UTF8.GetBytes(device.MID);
                                writer.WriteByte((byte)deviceMID.Length);
                                writer.WriteBytes(deviceMID);
                                byte[] deviceName = Encoding.UTF8.GetBytes(device.Name);
                                writer.WriteByte((byte)deviceName.Length);
                                writer.WriteBytes(deviceName);
                                UInt32 latestPulseUnix = 0;
                                if (device.LatestPulse.HasValue)
                                {
                                    latestPulseUnix = (UInt32)(device.LatestPulse.Value.Subtract(new DateTime(1970, 1, 1))).TotalSeconds;
                                }
                                writer.WriteUInt32(latestPulseUnix);
                            }
                        }
                    }
                }
                return stream.ToArray();
            }
        }

        public static byte[] WriteCSV(DetailedDevice[] devices)
        {
            using (MemoryStream stream = new MemoryStream())
            {
                using (TextWriter writer = new StreamWriter(stream))
                {
                    var groupedDevices = devices.GroupBy(d => d.TemplateId);
                    foreach (var deviceGroup in groupedDevices.OrderBy(g => g.Key))
                    {
                        writer.WriteLine($"{deviceGroup.Key};{deviceGroup.Count()}");
                        foreach (var device in deviceGroup.OrderBy(d => d.MID))
                        {
                            string mid = device.MID;
                            string name = device.Name.Replace(";", " ");
                            string pulseAgeHours;
                            if (device.LatestPulse.HasValue)
                            {
                                TimeSpan ts = DateTime.UtcNow - device.LatestPulse.Value;
                                pulseAgeHours = $"{(int)ts.TotalHours}";
                            }
                            else
                            {
                                pulseAgeHours = string.Empty;
                            }
                            writer.WriteLine($"{mid};{name};{pulseAgeHours}");
                        }
                    }
                }
                return stream.ToArray();
            }
        }
    }
}