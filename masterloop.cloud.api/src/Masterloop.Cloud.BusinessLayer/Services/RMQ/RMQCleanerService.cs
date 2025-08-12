using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text.RegularExpressions;
using Masterloop.Cloud.Core.RMQ.API;

namespace Masterloop.Cloud.BusinessLayer.Services.RMQ
{
    public class RMQCleanerService : IRMQCleanerService
    {
        private readonly string _connectionString;

        public RMQCleanerService(string connectionString)
        {
            _connectionString = connectionString;
        }

        /// <summary>
        /// Deletes temporary (@@@<guid>) RMQ users that do not have a corresponding temporary queue.
        /// </summary>
        /// <returns>Number of users that was deleted.</returns>
        public int CleanupUnusedUsers()
        {
            var management = new RMQAdminClient(_connectionString);

            var temporaryUsers = GetAllTemporaryUsers(management, null);
            if (temporaryUsers == null || temporaryUsers.Count == 0) return 0;

            var temporaryQueues = GetAllTemporaryQueues(management, null);
            if (temporaryQueues == null) return 0;

            var deadUsers = FindDeadUsers(temporaryUsers, temporaryQueues);
            return DeleteDeadUsers(deadUsers, management);
        }

        /// <summary>
        /// Deletes temporary (@@@<guid>) RMQ exchanges that do not have a corresponding temporary queue.
        /// </summary>
        /// <returns>Number of exchanges that have been deleted.</returns>
        public int CleanupUnusedExchanges()
        {
            var management = new RMQAdminClient(_connectionString);

            var temporaryExchanges = GetAllTemporaryExchanges(management, null);
            if (temporaryExchanges == null || temporaryExchanges.Count == 0) return 0;

            var temporaryQueues = GetAllTemporaryQueues(management, null);
            if (temporaryQueues == null) return 0;

            var deadExchanges = FindDeadExchanges(temporaryExchanges, temporaryQueues);

            return DeleteDeadExchanges(deadExchanges, management);
        }

        /// <summary>
        /// Deletes temporary (@@@<guid>) RMQ exchanges and users that do not have a corresponding temporary queue. Uses pagination for large data volumes support.
        /// </summary>
        /// <returns>Number of exchanges that have been deleted.</returns>
        public int CleanupUnusedExchangesAndUsers()
        {
            var management = new RMQAdminClient(_connectionString);

            var temporaryQueues = GetAllTemporaryQueues(management, 500);
            if (temporaryQueues == null) return 0;

            var temporaryExchanges = GetAllTemporaryExchanges(management, 500);
            if (temporaryExchanges == null || temporaryExchanges.Count == 0) return 0;

            var deadExchanges = FindDeadExchanges(temporaryExchanges, temporaryQueues);

            return DeleteDeadExchangesAndUsers(deadExchanges, management);
        }

        private static List<User> GetAllTemporaryUsers(RMQAdminClient management, int? pageSize)
        {
            IEnumerable<User> users = management.GetUsers(pageSize).Where(u => u.name.Contains("@@@"));
            List<User> temporaryUsers = new List<User>();
            foreach (User user in users)
            {
                string[] split = user.name.Split("@@@");
                if (split.Length == 2)
                {
                    if (ExtractGUID(split.Last().ToLower()) != null)
                    {
                        temporaryUsers.Add(user);
                    }
                }
            }
            return temporaryUsers;
        }

        private static string ExtractGUID(string line)
        {
            var match = Regex.Match(line, @"[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}");
            if (match.Success)
            {
                return match.Value;
            }
            else
            {
                return null;
            }
        }

        private static List<Queue> GetAllTemporaryQueues(RMQAdminClient management, int? pageSize)
        {
            IEnumerable<Queue> queues = management.GetQueues(pageSize).Where(q => q.name.Contains("@@@"));
            List<Queue> temporaryQueues = new List<Queue>();
            foreach (Queue queue in queues)
            {
                string[] split = queue.name.Split("@@@");
                if (split.Length == 2)
                {
                    if (ExtractGUID(split.Last().ToLower()) != null)
                    {
                        temporaryQueues.Add(queue);
                    }
                }
            }
            return temporaryQueues;
        }

        private static List<Exchange> GetAllTemporaryExchanges(RMQAdminClient management, int? pageSize)
        {
            IEnumerable<Exchange> exchanges = management.GetExchanges(pageSize).Where(e => e.name.Contains("@@@"));
            List<Exchange> temporaryExchanges = new List<Exchange>();
            foreach (Exchange exchange in exchanges)
            {
                string[] split = exchange.name.Split("@@@");
                if (split.Length == 2)
                {
                    if (ExtractGUID(split.Last()) != null)
                    {
                        temporaryExchanges.Add(exchange);
                    }
                }
            }
            return temporaryExchanges;
        }

        private static IEnumerable<User> FindDeadUsers(IEnumerable<User> temporaryUsers, List<Queue> temporaryQueues)
        {
            var deadUsers = new List<User>();
            foreach (var temporaryUser in temporaryUsers)
            {
                if (!temporaryQueues.Exists(q => q.name == temporaryUser.name))
                {
                    deadUsers.Add(temporaryUser);
                }
            }
            return deadUsers;
        }

        private static IEnumerable<Exchange> FindDeadExchanges(IEnumerable<Exchange> temporaryExchanges, List<Queue> temporaryQueues)
        {
            var deadExchanges = new List<Exchange>();
            foreach (var temporaryExchange in temporaryExchanges)
            {
                string equivalentQueueName = temporaryExchange.name.Substring(0, temporaryExchange.name.Length - 1) + "Q";
                if (!temporaryQueues.Exists(q => q.name == equivalentQueueName))
                {
                    deadExchanges.Add(temporaryExchange);
                }
            }
            return deadExchanges;
        }

        private static int DeleteDeadUsers(IEnumerable<User> deadUsers, RMQAdminClient management)
        {
            int counter = 0;
            foreach (var deadUser in deadUsers)
            {
                try
                {
                    management.DeleteUser(deadUser.name);
                    counter++;
                }
                catch (Exception)
                {
                }
            }
            return counter;
        }

        private static int DeleteDeadExchanges(IEnumerable<Exchange> deadExchanges, RMQAdminClient management)
        {
            int counter = 0;
            foreach (var deadExchange in deadExchanges)
            {
                try
                {
                    management.DeleteExchange(deadExchange.name);
                    counter++;
                }
                catch (Exception)
                {
                }
            }
            return counter;
        }

        private static int DeleteDeadExchangesAndUsers(IEnumerable<Exchange> deadExchanges, RMQAdminClient management)
        {
            int counter = 0;
            foreach (var deadExchange in deadExchanges)
            {
                try
                {
                    string exchangeName = deadExchange.name;
                    Trace.TraceInformation($"Deleting exchange and user {exchangeName}");
                    management.DeleteExchange(exchangeName);
                    string userName = exchangeName.Substring(0, exchangeName.Length - 1) + "Q";
                    management.DeleteUser(userName);
                    counter++;
                }
                catch (Exception e)
                {
                    Trace.TraceError($"Exception: {e.Message} / {e.StackTrace}");
                }
            }
            return counter;
        }
    }
}