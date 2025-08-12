using System;
using System.Collections.Generic;
using Masterloop.Core.Types.Commands;

namespace Masterloop.Cloud.Storage.Repositories.Interfaces
{
    public interface ICommandRepository
    {
        bool Create(string MID, CommandHistory command);
        int Create(Tuple<string, CommandHistory>[] command);
        CommandHistory Get(string MID, int commandId, DateTime timestamp);
        IEnumerable<CommandHistory> Get(string MID, DateTime from, DateTime to);
        bool Update(string MID, CommandResponse commandResponse);
        bool Update(Tuple<string, CommandResponse>[] commandResponses);
    }
}