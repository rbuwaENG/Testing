using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.BusinessLayer.Services.RMQ;
using Masterloop.Cloud.Core.RMQ;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Commands;
using System;
using System.Collections.Generic;

namespace Masterloop.Cloud.BusinessLayer.Managers
{
    public class CommandManager : ICommandManager
    {
        private readonly ICommandRepository _commandRepository;
        private readonly IRMQPublishService _rmqPublishService;

        public CommandManager(ICommandRepository commandRepository, IRMQPublishService rmqPublishService)
        {
            _commandRepository = commandRepository;
            _rmqPublishService = rmqPublishService;
        }

        public IEnumerable<CommandHistory> GetCommandHistory(string MID, DateTime from, DateTime to)
        {
            return _commandRepository.Get(MID, from, to);
        }

        public bool SendCommand(CommandMessage commandMessage)
        {
            return _rmqPublishService.PublishCommand(commandMessage);
        }

        public bool SendCommandResponse(CommandResponseMessage commandResponseMessage)
        {
            return _rmqPublishService.PublishCommandResponse(commandResponseMessage);
        }
    }
}