using System;
namespace Masterloop.Cloud.PulseWorker
{
    public interface IPulseGenerator : IDisposable
    {
        bool IsRunning { get; set; }

        bool Init();
        bool Run();
    }
}
