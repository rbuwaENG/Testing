using System;
using Microsoft.Extensions.Configuration;

namespace Masterloop.Cloud.MonitorWorker.Settings
{
    public class AppSettings
    {
        public int IntervalSeconds { get; set; }
        public string MCSAPIHost { get; set; }
        public string MCSUser { get; set; }
        public string MCSPasswd { get; set; }
        public string MCSDeviceMID { get; set; }

        public string MCSLoggerMID { get; set; }
        public string MCSLoggerPSK { get; set; }
        public int MCSCmdId { get; set; }
        public int MCSObsId { get; set; }

        public AppSettings(IConfiguration configuration)
        {
            // General
            IntervalSeconds = Int32.Parse(configuration.GetSection("General:IntervalSeconds").Value);

            // MCS
            MCSAPIHost = configuration.GetSection("MCS:APIHost").Value;
            MCSUser = configuration.GetSection("MCS:User").Value;
            MCSPasswd = configuration.GetSection("MCS:Passwd").Value;
            MCSDeviceMID = configuration.GetSection("MCS:DeviceMID").Value;

            MCSLoggerMID = configuration.GetSection("MCS:LoggerMID").Value;
            MCSLoggerPSK = configuration.GetSection("MCS:LoggerPSK").Value;
            MCSCmdId = Int32.Parse(configuration.GetSection("MCS:CmdId").Value);
            MCSObsId = Int32.Parse(configuration.GetSection("MCS:ObsId").Value);
        }
    }
}
