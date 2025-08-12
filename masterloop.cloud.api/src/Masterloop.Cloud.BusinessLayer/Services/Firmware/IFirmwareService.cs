namespace Masterloop.Cloud.BusinessLayer.Services.Firmware
{
    public interface IFirmwareService
    {
        string HDiffzPath { get; }
        string PublishProtocol { get; }
    }
}