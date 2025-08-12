using System;
using System.Globalization;
using System.Linq;
using System.Net;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.Core.RMQ;
using Masterloop.Cloud.Core.Security;
using Masterloop.Core.Types.Commands;
using Masterloop.Core.Types.EventLog;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Masterloop.Cloud.WebAPI.Controllers
{
    /// <summary>
    /// Command API.
    /// </summary>
    [Authorize]
    public class CommandController : Controller
    {
        private readonly ICommandManager _commandManager;
        private readonly IEventLogManager _eventLogManager;
        private readonly ISecurityManager _securityService;

        /// <summary>
        /// Constructor.
        /// </summary>
        public CommandController(ICommandManager commandManager, IEventLogManager eventLogManager, ISecurityManager securityManager)
        {
            _commandManager = commandManager;
            _eventLogManager = eventLogManager;
            _securityService = securityManager;
        }

        /// <summary>
        /// Get command history between two timestamps.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <param name="fromTimestamp">From timestamp formatted according to ISO 8601.</param>
        /// <param name="toTimestamp">To timestamp formatted according to ISO 8601.</param>
        /// <returns>Array of CommandHistory objects.</returns>
        [HttpGet]
        [Route("api/devices/{MID}/commands")]
        [ProducesResponseType(typeof(CommandHistory[]), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        public IActionResult GetHistory(string MID, string fromTimestamp, string toTimestamp)
        {
            DevicePermission permission = _securityService.GetDevicePermissionForAccountAndDevice(User.Identity.Name, MID);
            if (permission != null && permission.CanObserve)
            {
                DateTime from = DateTime.Parse(fromTimestamp, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal).ToUniversalTime();
                DateTime to = DateTime.Parse(toTimestamp, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal).ToUniversalTime();
                var result = _commandManager.GetCommandHistory(MID, from, to);
                return Ok(result);
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Send a new command to device.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <param name="commandId">Command identifier.</param>
        /// <param name="command">Command object.</param>
        /// <returns>HTTP response status code.</returns>
        [HttpPost]
        [Route("api/devices/{MID}/commands/{commandId}")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult CreateCommand(string MID, int commandId, [FromBody] Command command)
        {
            DevicePermission permission = _securityService.GetDevicePermissionForAccountAndDevice(User.Identity.Name, MID);
            if (permission != null && permission.CanControl)
            {
                try
                {
                    if (command != null)
                    {
                        CommandMessage msg = new CommandMessage()
                        {
                            MID = MID,
                            Command = command
                        };
                        msg.OriginAccount = User.Identity.Name;
                        if (Request.Headers != null && Request.Headers.Count() > 0)
                        {
                            if (Request.Headers.ContainsKey("OriginApplication")) msg.OriginApplication = Request.Headers.Single(h => h.Key == "OriginApplication").Value.Single();
                            if (Request.Headers.ContainsKey("OriginAddress")) msg.OriginAddress = Request.Headers.Single(h => h.Key == "OriginAddress").Value.Single();
                            if (Request.Headers.ContainsKey("OriginReference")) msg.OriginReference = Request.Headers.Single(h => h.Key == "OriginReference").Value.Single();
                        }
                        if (_commandManager.SendCommand(msg))
                        {
                            return Ok();
                        }
                        else
                        {
                            return BadRequest("Unable to publish command to broker.");
                        }
                    }
                    else
                    {
                        return BadRequest("Command object cannot be null");
                    }
                }
                catch (Exception e)
                {
                    DeviceEvent dli = new DeviceEvent(DateTime.UtcNow, EventCategoryType.Error, "Command failed for command id " + commandId, e.Message);
                    _eventLogManager.StoreDeviceEvent(MID, dli);
                    return BadRequest(dli.Title);
                }
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Send response to a received command.
        /// </summary>
        /// <param name="MID">Device identifier.</param>
        /// <param name="commandId">Command identifier.</param>
        /// <param name="commandResponse">CommandResponse object.</param>
        /// <returns></returns>
        [HttpPost]
        [Route("api/devices/{MID}/commands/{commandId}/response")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult RespondToCommand(string MID, int commandId, [FromBody] CommandResponse commandResponse)
        {
            if (MID == User.Identity.Name)
            {
                try
                {
                    if (commandResponse != null)
                    {
                        CommandResponseMessage msg = new CommandResponseMessage()
                        {
                            MID = MID,
                            CommandResponse = commandResponse
                        };

                        if (_commandManager.SendCommandResponse(msg))
                        {
                            return Ok();
                        }
                        else
                        {
                            return BadRequest("Unable to publish command response to broker.");
                        }
                    }
                    else
                    {
                        return BadRequest("Command response object cannot be null");
                    }
                }
                catch (Exception e)
                {
                    DeviceEvent dli = null;
                    dli = new DeviceEvent(DateTime.UtcNow, EventCategoryType.Error, "Command response failed for command id " + commandId, e.Message);
                    _eventLogManager.StoreDeviceEvent(MID, dli);
                    return BadRequest(dli.Title);
                }
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Send multiple commands to multiple device in one call.
        /// </summary>
        /// <param name="commandPackages">Command packages.</param>
        /// <returns>HTTP response status code.</returns>
        [HttpPost]
        [Route("api/tools/multicommands")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult CreateMultipleDeviceCommands([FromBody] CommandsPackage[] commandPackages)
        {
            if (commandPackages != null && commandPackages.Length > 0)
            {
                foreach (CommandsPackage commandPackage in commandPackages)
                {
                    if (commandPackage.Commands != null && commandPackage.Commands.Length > 0)
                    {
                        foreach (Command command in commandPackage.Commands)
                        {
                            IActionResult result = CreateCommand(commandPackage.MID, command.Id, command);
                            if (result.GetType() != typeof(OkResult))
                            {
                                return result;
                            }
                        }
                    }
                }
                return Ok();
            }
            else
            {
                return BadRequest("No commands specified.");
            }
        }
    }
}