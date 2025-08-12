namespace Masterloop.Cloud.BusinessLayer.Services.Firmware
{
    public class FirmwareService : IFirmwareService
    {
        public string HDiffzPath
        {
            get;
            private set;
        }

        public string PublishProtocol
        {
            get;
            private set;
        }

        public FirmwareService(string hDiffzPath, string publishProtocol)
        {
            HDiffzPath = hDiffzPath;
            PublishProtocol = publishProtocol;
        }
    }
}