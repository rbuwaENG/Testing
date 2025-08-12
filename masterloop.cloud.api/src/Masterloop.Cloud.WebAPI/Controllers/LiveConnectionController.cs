using System;
using System.Net;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.Core.Security;
using Masterloop.Core.Types.Devices;
using Masterloop.Core.Types.EventLog;
using Masterloop.Core.Types.LiveConnect;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Masterloop.Cloud.WebAPI.Controllers
{
    /// <summary>
    /// LiveConnection API.
    /// </summary>
    [Authorize]
    public class LiveConnectionController : Controller
    {
        private readonly IEventLogManager _eventLogManager;
        private readonly IDeviceManager _deviceManager;
        private readonly ISecurityManager _securityManager;
        private readonly ILiveConnectionManager _liveConnectionManager;

        private const int _DEFAULT_BACKOFF_SECONDS = 120;

        /// <summary>
        /// Constructor.
        /// </summary>
        public LiveConnectionController(IEventLogManager eventLogManager, IDeviceManager deviceManager, ISecurityManager securityManager, ILiveConnectionManager liveConnectionManager)
        {
            _eventLogManager = eventLogManager;
            _deviceManager = deviceManager;
            _securityManager = securityManager;
            _liveConnectionManager = liveConnectionManager;
        }

        /// <summary>
        /// Creates a live connection account on server using the default protocol (AMQPS).
        /// </summary>
        /// <returns>The live connection details.</returns>
        /// <param name="connectionRequests">Connection requests.</param>
        [HttpPost]
        [Route("api/tools/liveconnect")]
        [ProducesResponseType(typeof(LiveConnectionDetails), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult RequestLiveConnectionEndpointByAMQPS([FromBody] LiveAppRequest[] connectionRequests)
        {
            return RequestLiveConnectionEndpointByProtocol("AMQPS", connectionRequests);
        }

        /// <summary>
        /// Creates a live connection account on server using user requested protocol type.
        /// </summary>
        /// <returns>The live connection details.</returns>
        /// <param name="protocol">Protocol: AMQP | AMQPS | WS | WSS.</param>
        /// <param name="connectionRequests">Connection requests.</param>
        [HttpPost]
        [Route("api/tools/liveconnect/{protocol}")]
        [ProducesResponseType(typeof(LiveConnectionDetails), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult RequestLiveConnectionEndpointByProtocol(string protocol, [FromBody] LiveAppRequest[] connectionRequests)
        {
            IActionResult result = AuthorizeLiveRequest(connectionRequests);
            if (result is OkResult)
            {
                try
                {
                    LiveConnectionDetails details = _liveConnectionManager.CreateTemporaryEndpoint(User.Identity.Name, protocol, connectionRequests);
                    return Ok(details);
                }
                catch (Exception e)
                {
                    return BadRequest(e.Message);
                }
            }
            else
            {
                return result;
            }
        }

        /// <summary>
        /// Deletes the temporary live connection.
        /// </summary>
        /// <returns>HTTP status code.</returns>
        /// <param name="temporaryKey">Temporary key.</param>
        [HttpDelete]
        [Route("api/tools/liveconnect/{temporaryKey}")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult DeleteTemporaryLiveConnection(string temporaryKey)
        {
            if (temporaryKey != null && temporaryKey.Length > 0)
            {
                Guid guid;
                if (Guid.TryParse(temporaryKey, out guid))
                {
                    _liveConnectionManager.DeleteTemporaryEndpoint(User.Identity.Name, guid);
                    return Ok();
                }
                else
                {
                    return BadRequest("TemporaryKey must be a valid GUID.");
                }
            }
            else
            {
                return BadRequest("TemporaryKey must be specified.");
            }
        }

        /// <summary>
        /// Request connection details for existing persistent subscription using the default protocol (AMQPS).
        /// </summary>
        /// <param name="subscriptionKey">Persistent subscription key string.</param>
        /// <returns>Persistent subscription connection details.</returns>
        [HttpGet]
        [Route("api/tools/liveconnect/persistent/{subscriptionKey}")]
        [ProducesResponseType(typeof(LiveConnectionDetails), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult RequestPersistentLiveConnectionEndpointByAMQPS(string subscriptionKey)
        {
            return RequestPersistentLiveConnectionEndpointByProtocol(subscriptionKey, "AMQPS");
        }

        /// <summary>
        /// Request connection details for existing persistent subscription using user requested protocol type.
        /// </summary>
        /// <param name="subscriptionKey">Persistent subscription key string.</param>
        /// <param name="protocol">Protocol: AMQP | AMQPS | WS | WSS.</param>
        /// <returns>Persistent subscription connection details.</returns>
        [HttpGet]
        [Route("api/tools/liveconnect/persistent/{subscriptionKey}/{protocol}")]
        [ProducesResponseType(typeof(LiveConnectionDetails), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult RequestPersistentLiveConnectionEndpointByProtocol(string subscriptionKey, string protocol)
        {
            try
            {
                LiveConnectionDetails details = _liveConnectionManager.GetPersistentEndpoint(User.Identity.Name, subscriptionKey, protocol);
                return Ok(details);
            }
            catch (Exception e)
            {
                return BadRequest(e.Message);
            }
        }

        /// <summary>
        /// Creates a persistent live connection.
        /// </summary>
        /// <returns>The persistent live connection.</returns>
        /// <param name="connectionRequest">Connection request.</param>
        [HttpPost]
        [Route("api/tools/liveconnect/persistent")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult CreatePersistentLiveConnection([FromBody] LivePersistentSubscriptionRequest connectionRequest)
        {
            if (connectionRequest != null && connectionRequest.SubscriptionKey != null)
            {
                if (connectionRequest.SubscriptionKey.Length >= 4 && connectionRequest.SubscriptionKey.Length <= 16)
                {
                    IActionResult authorizeResult = AuthorizeLiveRequest(new LiveRequest[] { connectionRequest });
                    if (authorizeResult is OkResult)
                    {
                        try
                        {
                            _liveConnectionManager.CreatePersistentEndpoint(User.Identity.Name, connectionRequest);
                            return Ok();
                        }
                        catch (Exception e)
                        {
                            return BadRequest(e.Message);
                        }
                    }
                    else
                    {
                        return authorizeResult;
                    }
                }
                else
                {
                    return BadRequest("SubscriptionKey must be between 4 and 16 characters of length.");
                }
            }
            else
            {
                return BadRequest("SubscriptionKey must be specified for persistent live connection requests.");
            }
        }

        /// <summary>
        /// Adds device to persistent subscription whitelist.
        /// </summary>
        /// <param name="subscriptionKey">Persistent subscription key string.</param>
        /// <param name="mid">Device identifier.</param>
        /// <returns>Void</returns>
        [HttpPost]
        [Route("api/tools/liveconnect/persistent/{subscriptionKey}/devices")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult AddPersistentSubscriptionDevice(string subscriptionKey, [FromBody] string mid)
        {
            DevicePermission dp = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, mid);
            if (dp != null && dp.CanObserve && dp.CanControl)
            {
                if (_liveConnectionManager.WhitelistExists(User.Identity.Name, subscriptionKey))
                {
                    Device device = _deviceManager.GetDevice(mid, false);
                    if (device != null)
                    {
                        _liveConnectionManager.AddDeviceToWhitelist(User.Identity.Name, subscriptionKey, device.TemplateId, mid);
                        return Ok();
                    }
                    else
                    {
                        return BadRequest($"Unknown device identifier {mid}");
                    }
                }
                else
                {
                    return BadRequest("Persistent subscription does not contain white-listing. MIDs should have been set to non-null on creation, see API documentation.");
                }
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Removes device from persistent subscription whitelist.
        /// </summary>
        /// <param name="subscriptionKey">Persistent subscription key string.</param>
        /// <param name="mid">Device identifier.</param>
        /// <returns>Void</returns>
        [HttpDelete]
        [Route("api/tools/liveconnect/persistent/{subscriptionKey}/devices/{mid}")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult RemovePersistentSubscriptionDevice(string subscriptionKey, string mid)
        {
            DevicePermission dp = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, mid);
            if (dp != null && dp.CanObserve && dp.CanControl)
            {
                if (_liveConnectionManager.WhitelistExists(User.Identity.Name, subscriptionKey))
                {

                    Device device = _deviceManager.GetDevice(mid, false);
                    if (device != null)
                    {
                        _liveConnectionManager.RemoveDeviceFromWhitelist(User.Identity.Name, subscriptionKey, device.TemplateId, mid);
                        return Ok();
                    }
                    else
                    {
                        return BadRequest($"Unknown device identifier {mid}");
                    }
                }
                else
                {
                    return BadRequest("Persistent subscription does not allow device white-listing. MIDs should have been set to non-null on creation, see API documentation.");
                }
            }
            else
            {
                return Unauthorized();
            }
        }

        /// <summary>
        /// Deletes a persistent live connection.
        /// </summary>
        /// <returns>HTTP status code.</returns>
        /// <param name="subscriptionKey">Subscription key as UUID.</param>
        [HttpDelete]
        [Route("api/tools/liveconnect/persistent/{subscriptionKey}")]
        [ProducesResponseType((int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult DeletePersistentLiveConnection(string subscriptionKey)
        {
            if (subscriptionKey != null && subscriptionKey.Length >= 4 && subscriptionKey.Length <= 16)
            {
                _liveConnectionManager.DeletePersistentEndpoint(User.Identity.Name, subscriptionKey);
                return Ok();
            }
            else
            {
                return BadRequest("SubscriptionKey must be specified and be between 4 and 16 characters of length.");
            }
        }

        /// <summary>
        /// Checks if authenticated user is allowed to request live subscription for specified elements.
        /// </summary>
        /// <param name="connectionRequests">Array of connection requests.</param>
        /// <returns>Ok if allowed, otherwise appropriate HTTP result based on reason.</returns>
        private IActionResult AuthorizeLiveRequest(LiveRequest[] connectionRequests)
        {
            // Ensure that logged in user has permissions to observe all specified MIDs in request.
            if (connectionRequests != null && connectionRequests.Length > 0)
            {
                foreach (LiveRequest cr in connectionRequests)
                {
                    ObjectPermission permission = null;
                    if (cr != null && cr is LiveAppRequest)
                    {
                        LiveAppRequest lar = cr as LiveAppRequest;
                        if (lar.TID != null && lar.MID == null)
                        {
                            permission = _securityManager.GetTemplatePermissionForAccountAndTemplate(User.Identity.Name, lar.TID);
                        }
                        else if (lar.TID == null && lar.MID != null)
                        {
                            permission = _securityManager.GetDevicePermissionForAccountAndDevice(User.Identity.Name, lar.MID);
                        }
                        else
                        {
                            return BadRequest("Either only TID or MID must be specified (not both or none).");
                        }

                        IActionResult subResult = AuthorizeLiveRequestDetails(cr, permission);
                        if (subResult.GetType() != typeof(OkObjectResult))
                        {
                            return subResult;
                        }
                    }
                    else if (cr != null && cr is LivePersistentSubscriptionRequest)
                    {
                        LivePersistentSubscriptionRequest lpsr = cr as LivePersistentSubscriptionRequest;
                        if (lpsr.TID != null)
                        {
                            permission = _securityManager.GetTemplatePermissionForAccountAndTemplate(User.Identity.Name, lpsr.TID);
                            IActionResult subResult = AuthorizeLiveRequestDetails(cr, permission);
                            if (subResult.GetType() != typeof(OkObjectResult))
                            {
                                return subResult;
                            }
                        }
                        else
                        {
                            return BadRequest("TID or MIDs must be specified.");
                        }
                    }
                    else if (cr != null)
                    {
                        return BadRequest($"Unknown argument type: {cr.GetType()}");
                    }
                    else
                    {
                        return BadRequest($"Request array contains not-allowed null object.");
                    }
                }
            }
            else
            {
                return BadRequest("ConnectionRequests does not contain any MIDs or TIDs.");
            }
            return Ok();
        }

        /// <summary>
        /// Checks if authenticated user is allowed to access objects on finest level.
        /// </summary>
        /// <param name="cr">Request structure.</param>
        /// <param name="permission">Permission structure.</param>
        /// <returns>OK if allowed, otherwise with expanation of why.</returns>
        private IActionResult AuthorizeLiveRequestDetails(LiveRequest cr, ObjectPermission permission)
        {
            Account account = null;
            if (permission == null)  // No permissions found.
            {
                return Unauthorized();
            }
            if (!permission.CanObserve && (cr.ConnectAllObservations || cr.ObservationIds != null))
            {
                return Unauthorized("User does not have permissions to observe one or more requested objects.");
            }
            if (!permission.CanControl && (cr.ConnectAllCommands || cr.CommandIds != null))
            {
                return Unauthorized("User does not have permissions to control one or more requested objects.");
            }
            if (account == null)
            {
                account = _securityManager.GetAccount(User.Identity.Name);
            }
            if (cr.PulseId.HasValue)
            {
                if (account == null || account.AccountType != AccountType.Tenant)
                {
                    return Forbid("PulseId may only be specified when logged in with Tenant Account.");
                }
                if (cr.PulseId == 0)
                {
                    return Forbid("PulseId must be different from 0. PulseId 0 is reserved for devices.");
                }
            }
            return Ok(account);
        }

        /// <summary>
        /// Gets the live connection details for an AMQP device (legacy).
        /// </summary>
        /// <returns>The live connection details.</returns>
        /// <param name="MID">Device identifier.</param>
        [HttpGet]
        [Route("api/devices/{MID}/liveconnect")]
        [ProducesResponseType(typeof(LiveConnectionDetails), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        public IActionResult GetLiveConnectionDetails(string MID)
        {
            if (MID != null && MID.Length > 0)
            {
                if (MID == User.Identity.Name)
                {
                    DeviceConnection deviceConnection = _liveConnectionManager.GetDeviceConnection(MID);
                    if (deviceConnection != null && deviceConnection.Node != null)
                    {
                        DeviceNodeAMQP amqp = deviceConnection.Node as DeviceNodeAMQP;
                        LiveConnectionDetails lcd = new LiveConnectionDetails()
                        {
                            Server = amqp.MQHost,
                            Port = amqp.MQPortEnc,
                            UseSsl = true,
                            Username = MID,
                            ExchangeName = amqp.AMQPExchange,
                            QueueName = amqp.AMQPQueue,
                            VirtualHost = amqp.AMQPVHost
                        };
                        // Store event
                        string eventBody = $"API={amqp.APIHost} | MQ={amqp.MQHost}";
                        DeviceEvent deviceEvent = new DeviceEvent(DateTime.UtcNow, EventCategoryType.Information, "Live Connection Requested", eventBody);
                        _eventLogManager.StoreDeviceEvent(MID, deviceEvent);
                        return Ok(lcd);
                    }
                    else
                    {
                        return BadRequest();
                    }
                }
                else
                {
                    return Unauthorized();
                }
            }
            else
            {
                return BadRequest();
            }
        }

        [HttpGet]
        [Route("api/devices/{MID}/connect")]
        [ProducesResponseType(typeof(DeviceConnection), (int)HttpStatusCode.OK)]
        [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType((int)HttpStatusCode.BadRequest)]
        [ProducesResponseType((int)HttpStatusCode.NotFound)]
        public IActionResult GetDeviceConnection(string MID)
        {
            if (MID != null && MID.Length > 0)
            {
                if (MID == User.Identity.Name)
                {
                    DeviceConnection deviceConnection = _liveConnectionManager.GetDeviceConnection(MID);
                    if (deviceConnection != null && deviceConnection.Node != null)
                    {
                        // Store event
                        string eventBody = $"API={deviceConnection.Node.APIHost} | MQ={deviceConnection.Node.MQHost}";
                        DeviceEvent deviceEvent = new DeviceEvent(DateTime.UtcNow, EventCategoryType.Information, "Connection Requested", eventBody);
                        _eventLogManager.StoreDeviceEvent(MID, deviceEvent);

                        return Ok(deviceConnection);
                    }
                    else
                    {
                        return NotFound();
                    }
                }
                else
                {
                    return Unauthorized();
                }
            }
            else
            {
                return BadRequest($"Invalid MID: {MID}");
            }
        }
    }
}