using System.Collections.Generic;
using Masterloop.Cloud.Core.RMQ.API;

namespace Masterloop.Cloud.BusinessLayer.Services.RMQ
{
    public interface IRMQAdminClient
    {
        void CreateTopicExchange(string exchangeName, string vhostName = "");
        void CreateInternalFanoutExchange(string exchangeName, string vhostName = "");
        void CreateShortlivedTopicExchange(string exchangeName, string vhostName = "");
        void CreateShortlivedTopicExchange(string exchangeName, int timeToLiveInMilliseconds, bool durable = false, string vhostName = "");
        void DeleteUser(string username);
        void DeleteQueue(string queueName, string vhostName = "");
        void DeleteExchange(string exchangeName, string vhostName = "");
        Exchange GetExchange(string exchangeName, string vhostName = "");
        void DeleteConnection(string connectionName);
        Queue GetQueue(string queueName, string vhostName = "");
        User GetUser(string userName, string vhostName = "");
        IEnumerable<Exchange> GetExchanges(int? pageSize);
        IEnumerable<Queue> GetQueues(int? pageSize);
        Message[] GetQueueMessages(string queueName, int maxMessages, bool acknowledge, bool requeue, string vhostName = "");
        IEnumerable<User> GetUsers(int? pageSize);
        IEnumerable<Binding> GetBindingsWithSource(string exchangeName, string vhostName = "");
        IEnumerable<Binding> GetQueueBindings(string queueName, string vhostName = "");
        IEnumerable<Binding> GetBindingsWithDestination(string exchangeName, string vhostName = "");
        IEnumerable<ConnectionInfo> GetConnections();
        void DeleteBinding(Binding binding);
        void CreateQueue(string queueName, string vhostName = "");
        void CreateShortlivedQueue(string queueName, int timeToLiveInMilliseconds, bool durable = false, string vhostName = "");
        void CreateDirectBindingBetweenExchangeAndQueue(string exchangeName, string queueName, string vhostName = "");
        void CreateBindingBetweenExchangeAndQueue(string exchangeName, string queueName, string routingKey, string vhostName = "");
        void CreateBindingBetweenTwoExchanges(string fromExchangeName, string toExchangeName, string routingKey, string vhostName = "");
        void CreateUser(string username, string password);
        void CreateUserPermission(string username, PermissionInfo permissionInfo, string vhostName = "");
        void CreateTopicPermission(string username, TopicPermissionInfo topicPermissionInfo, string vhostName = "");
    }
}