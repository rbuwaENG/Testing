using System;
using System.Collections.Generic;
using Masterloop.Cloud.Core.RMQ;
using Masterloop.Core.Types.Commands;

namespace Masterloop.Cloud.BusinessLayer.Managers.Interfaces
{
    public interface ICommandManager
    {
        IEnumerable<CommandHistory> GetCommandHistory(string MID, DateTime from, DateTime to);
        bool SendCommand(CommandMessage commandMessage);
        bool SendCommandResponse(CommandResponseMessage commandResponseMessage);
    }
}