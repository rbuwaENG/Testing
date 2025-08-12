using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using Masterloop.Cloud.BusinessLayer.Services.RMQ;
using Masterloop.Cloud.Core.RMQ.API;
using Masterloop.Core.Types.Devices;
using Masterloop.Plugin.Application;

namespace Masterloop.Tools.AdminTool
{
    public class RMQTool
    {
        private MasterloopServerConnection _mcs;
        private RMQAdminClient _rmq;

        public RMQTool(string mcs4Host, string mcs4User, string mcs4Pass, string rmqCon)
        {
            _mcs = new MasterloopServerConnection(mcs4Host, mcs4User, mcs4Pass);
            _mcs.Timeout = 10 * 60;
            _rmq = new RMQAdminClient(rmqCon);
        }

        public string[] GetAllExchanges()
        {
            IEnumerable<Exchange> exchanges = _rmq.GetExchanges(500);
            if (exchanges != null)
            {
                return exchanges.Select(x => x.name).ToArray();
            }
            else
            {
                return null;
            }
        }

        public string[] GetAllQueues()
        {
            IEnumerable<Queue> queues = _rmq.GetQueues(500);
            if (queues != null)
            {
                return queues.Select(q => q.name).ToArray();
            }
            else
            {
                return null;
            }
        }

        public string[] GetAllUsers()
        {
            IEnumerable<User> users = _rmq.GetUsers(500);
            if (users != null)
            {
                return users.Select(u => u.name).ToArray();
            }
            else
            {
                return null;
            }
        }

        public void RemoveAMQPQueues(string tid, DateTime fromCreatedTime)
        {
            Trace.TraceInformation("Getting template devices...");
            DetailedDevice[] devices = _mcs.GetDevices(false, false);
            devices = devices.Where(d => d.TemplateId == tid && d.CreatedOn >= fromCreatedTime).OrderBy(d => d.CreatedOn).ToArray();
            int counter = 0;

            foreach (DetailedDevice device in devices)
            {
                try
                {
                    Trace.TraceInformation($"Deleting queue for device {device.MID} created on {device.CreatedOn:o} [{(100 * counter) / devices.Length} %]");
                    _rmq.DeleteQueue($"{device.MID}.Q");
                }
                catch (Exception e)
                {
                    Trace.TraceError(e.Message);
                }
                counter++;
            }
        }

        public void RemoveExchanges(string filename)
        {
            Trace.TraceInformation("Loading exchange names from file...");
            string[] exchangeNames = File.ReadAllLines(filename);
            if (exchangeNames != null && exchangeNames.Length > 0)
            {
                for (int i = 0; i < exchangeNames.Length; i++)
                {
                    string exchangeName = exchangeNames[i];
                    Trace.TraceInformation($"Deleting exchange {exchangeName} ({i + 1} of {exchangeNames.Length})");
                    _rmq.DeleteExchange(exchangeName);
                }
            }
        }

        public void RemoveQueues(string filename)
        {
            Trace.TraceInformation("Loading queue names from file...");
            string[] queueNames = File.ReadAllLines(filename);
            if (queueNames != null && queueNames.Length > 0)
            {
                for (int i = 0; i < queueNames.Length; i++)
                {
                    string queueName = queueNames[i];
                    Trace.TraceInformation($"Deleting queue {queueName} ({i + 1} of {queueNames.Length})");
                    _rmq.DeleteQueue(queueName);
                }
            }
        }

        public void RemoveUsers(string filename)
        {
            Trace.TraceInformation("Loading users from file...");
            string[] users = File.ReadAllLines(filename);
            if (users != null && users.Length > 0)
            {
                for (int i = 0; i < users.Length; i++)
                {
                    string user = users[i];
                    Trace.TraceInformation($"Deleting user {user} ({i + 1} of {users.Length})");
                    _rmq.DeleteUser(user);
                }
            }
        }
    }
}