using System.Diagnostics;
using System.IO;
using Masterloop.Core.Types.Devices;
using Masterloop.Plugin.Application;

namespace Masterloop.Tools.AdminTool
{
    public class APITool
    {
        private MasterloopServerConnection _source, _target;

        public APITool(string sourceHost, string sourceUser, string sourcePasswd, string targetHost, string targetUser, string targetPasswd)
        {
            _source = new MasterloopServerConnection(sourceHost, sourceUser, sourcePasswd);
            _target = new MasterloopServerConnection(targetHost, targetUser, targetPasswd);
        }

        public void CopyDevicesByFile(string targetTID, string filename)
        {
            Trace.TraceInformation($"Copying devices from file {filename} to template {targetTID}.");

            using (StreamReader file = new StreamReader(filename))
            {
                string mid;
                while ((mid = file.ReadLine()) != null)
                {
                    SecureDetailedDevice device = _source.GetSecureDeviceDetails(mid);
                    NewDevice d = new NewDevice()
                    {
                        MID = device.MID,
                        Name = device.Name,
                        Description = device.Description,
                        CreatedOn = device.CreatedOn,
                        UpdatedOn = device.UpdatedOn,
                        PreSharedKey = device.PreSharedKey,
                        TemplateId = targetTID
                    };
                    DetailedDevice result = _target.CreateDevice(d);
                    if (result != null && result.MID == mid)
                    {
                        Trace.TraceInformation($"{mid} created with template {targetTID}.");
                    }
                    else
                    {
                        Trace.TraceError($"Failed to create device {mid}.");
                        Trace.TraceError($"Source error report: {_source.LastHttpStatusCode} - {_source.LastErrorMessage}");
                        Trace.TraceError($"Target error report: {_target.LastHttpStatusCode} - {_target.LastErrorMessage}");
                    }
                }
            }
        }
    }
}