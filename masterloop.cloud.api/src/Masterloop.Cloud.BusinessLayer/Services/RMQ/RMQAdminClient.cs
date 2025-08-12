using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Collections.Generic;
using Masterloop.Cloud.Core.RMQ;
using Masterloop.Cloud.Core.RMQ.API;
using System.Diagnostics;

namespace Masterloop.Cloud.BusinessLayer.Services.RMQ
{
    public class RMQAdminClient : IRMQAdminClient
    {
        private readonly string _hostname;
        private readonly string _username;
        private readonly string _password;
        private readonly int _portNumber;
        private readonly bool _useHttps;
        private readonly string _defaultVhostName;

        public RMQAdminClient(string connectionString)
        {
            MessagingConnection mc = new MessagingConnection(connectionString);
            _hostname = mc.HostName;
            _username = mc.Username;
            _password = mc.Password;
            _portNumber = mc.Port;
            _useHttps = mc.Encrypted;
            _defaultVhostName = mc.VHost;
        }

        public void CreateTopicExchange(string exchangeName, string vhostName = "")
        {
            var info = new ExchangeInfo()
                            .SetToTopicType()
                            .SetAutoDeleteOff()
                            .SetDurableOn();
            CreateExchange(exchangeName, info, vhostName);
        }

        public void CreateInternalFanoutExchange(string exchangeName, string vhostName = "")
        {
            var info = new ExchangeInfo()
                            .SetToFanoutType()
                            .SetAutoDeleteOff()
                            .SetDurableOn()
                            .SetToInternal();
            CreateExchange(exchangeName, info, vhostName);
        }

        public void CreateShortlivedTopicExchange(string exchangeName, string vhostName = "")
        {
            var info = new ExchangeInfo()
                            .SetToTopicType()
                            .SetAutoDeleteOn()
                            .SetDurableOff();
            CreateExchange(exchangeName, info, vhostName);
        }

        public void CreateShortlivedTopicExchange(string exchangeName, int timeToLiveInMilliseconds, bool durable = false, string vhostName = "")
        {
            var info = new ExchangeInfo()
                            .SetToTopicType()
                            .SetAutoDeleteOff()
                            .SetDurableOff();
            if (durable)
            {
                info.SetDurableOn();
            }
            info.arguments.Add("x-expires", timeToLiveInMilliseconds.ToString());
            CreateExchange(exchangeName, info, vhostName);
        }

        public void DeleteUser(string username)
        {

            var url = string.Format("users/{0}", username);
            DeleteResource(url, "Error deleting user");
        }

        private void DeleteResource(string url, string errorMessage)
        {
            var baseUrl = GetBaseUrl();
            using (var client = new HttpClient())
            {
                SetDefaultValues(client, baseUrl);
                var res = client.DeleteAsync(url);
                res.Wait();
                if (!res.Result.IsSuccessStatusCode)
                {
                    if (res.Result.StatusCode != HttpStatusCode.NotFound) // it only means it has already been deleted
                    {
                        throw new Exception(string.Format("{0}. ResponseCode: {1}. Reason: {2}", errorMessage, res.Result.StatusCode, res.Result.ReasonPhrase));
                    }
                }
            }
        }

        public void DeleteQueue(string queueName, string vhostName = "")
        {
            var url = string.Format("queues/{0}/{1}", GetVhostName(vhostName), queueName);
            DeleteResource(url, "Error deleting queue");
        }

        public void DeleteExchange(string exchangeName, string vhostName = "")
        {
            var url = string.Format("exchanges/{0}/{1}", GetVhostName(vhostName), exchangeName);
            DeleteResource(url, "Error deleting exchange");
        }

        public Exchange GetExchange(string exchangeName, string vhostName = "")
        {
            try
            {
                var url = string.Format("exchanges/{0}/{1}", GetVhostName(vhostName), exchangeName);
                string errorMessage = "Error deleting exchange";
                return Get<Exchange>(url, errorMessage);
            }
            catch (Exception)
            {
                return null;
            }
        }

        public void DeleteConnection(string connectionName)
        {
            var url = string.Format("connections/{0}", connectionName);
            DeleteResource(url, "Error deleting connection");
        }

        public Queue GetQueue(string queueName, string vhostName = "")
        {
            try
            {
                var url = string.Format("queues/{0}/{1}", GetVhostName(vhostName), queueName);
                string errorMessage = "Error getting queue";
                return Get<Queue>(url, errorMessage);
            }
            catch (Exception)
            {
                return null;
            }
        }

        public User GetUser(string userName, string vhostName = "")
        {
            try
            {
                var url = string.Format("users/{0}/{1}", GetVhostName(vhostName), userName);
                string errorMessage = "Error getting user";
                return Get<User>(url, errorMessage);
            }
            catch (Exception)
            {
                return null;
            }
        }

        public IEnumerable<Exchange> GetExchanges(int? pageSize)
        {
            if (pageSize.HasValue)
            {
                return GetPaged<Exchange>("exchanges", pageSize.Value);
            }
            else
            {
                string url = "exchanges";
                string errorMessage = "Error getting exchanges";
                return Get<IEnumerable<Exchange>>(url, errorMessage);
            }
        }

        public IEnumerable<Queue> GetQueues(int? pageSize)
        {
            if (pageSize.HasValue)
            {
                return GetPaged<Queue>("queues", pageSize.Value);
            }
            else
            {
                string url = "queues";
                string errorMessage = "Error getting queues";
                return Get<IEnumerable<Queue>>(url, errorMessage);
            }
        }

        public Message[] GetQueueMessages(string queueName, int maxMessages, bool acknowledge, bool requeue, string vhostName = "")
        {
            string url = $"queues/{GetVhostName(vhostName)}/{queueName}/get";

            QueueMessageArgument arg = new QueueMessageArgument()
            {
                count = maxMessages,
                ackmode = acknowledge ? (requeue ? "ack_requeue_true" : "ack_requeue_false") : (requeue ? "reject_requeue_true" : "reject_requeue_false"),
                encoding = "auto"
            };
            string errorMessage = "Error getting queue messages";

            return Post<Message[]>(url, errorMessage, arg);

        }

        public IEnumerable<User> GetUsers(int? pageSize)
        {
            if (pageSize.HasValue)
            {
                return GetPaged<User>("users", pageSize.Value);
            }
            else
            {
                string url = "users";
                string errorMessage = "Error getting users";
                return Get<IEnumerable<User>>(url, errorMessage);
            }
        }

        public IEnumerable<Binding> GetBindingsWithSource(string exchangeName, string vhostName = "")
        {
            string url = string.Format("exchanges/{0}/{1}/bindings/source", GetVhostName(vhostName), exchangeName);
            string errorMessage = "Error getting source bindings";
            return Get<IEnumerable<Binding>>(url, errorMessage);
        }

        public IEnumerable<Binding> GetQueueBindings(string queueName, string vhostName = "")
        {
            string url = string.Format("queues/{0}/{1}/bindings", GetVhostName(vhostName), queueName);
            string errorMessage = "Error getting queue bindings";
            return Get<IEnumerable<Binding>>(url, errorMessage);
        }

        public IEnumerable<Binding> GetBindingsWithDestination(string exchangeName, string vhostName = "")
        {
            string url = string.Format("exchanges/{0}/{1}/bindings/destination", GetVhostName(vhostName), exchangeName);
            string errorMessage = "Error getting target bindings";
            return Get<IEnumerable<Binding>>(url, errorMessage);
        }

        public IEnumerable<ConnectionInfo> GetConnections()
        {
            string url = string.Format("connections/");
            string errorMessage = "Error getting connections";
            return Get<IEnumerable<ConnectionInfo>>(url, errorMessage);
        }

        private T Get<T>(string url, string errorMessage)
        {
            var baseUrl = GetBaseUrl();
            using (var client = new HttpClient())
            {
                SetDefaultValues(client, baseUrl);
                var res = client.GetAsync(url);
                res.Wait();
                HttpResponseMessage result = res.Result;
                if (!result.IsSuccessStatusCode)
                {
                    throw new Exception(string.Format("{0}. ResponseCode: {1}. Reason: {2}", errorMessage,
                        res.Result.StatusCode, res.Result.ReasonPhrase));
                }
                var dataTask = result.Content.ReadAsAsync<T>();
                dataTask.Wait();
                T data = dataTask.Result;
                return data;
            }
        }

        private IEnumerable<T> GetPaged<T>(string entity, int pageSize)
        {
            string errorMessage = $"Error getting {entity}";
            List<T> items = new List<T>();
            int currentPage = 1;
            Page<T> page = new Page<T>();
            do
            {
                string url = $"{entity}?page={currentPage}&page_size={pageSize}";
                page = Get<Page<T>>(url, errorMessage);
                if (page != null && page.items != null)
                {
                    Trace.TraceInformation($"{entity} page {currentPage} of {page.page_count}.");
                    items.AddRange(page.items);
                }
            } while (page != null && ++currentPage <= page.page_count);

            return items;
        }

        private T Post<T>(string url, string errorMessage, object argument)
        {
            using (var client = new HttpClient())
            {
                var baseUrl = GetBaseUrl();
                SetDefaultValues(client, baseUrl);
                var res = client.PostAsJsonAsync(url, argument);
                res.Wait();
                HttpResponseMessage result = res.Result;
                if (!res.Result.IsSuccessStatusCode)
                {
                    throw new Exception(string.Format("RMQ Post error. ResponseCode: {0}. Reason: {1}", res.Result.StatusCode, res.Result.ReasonPhrase));
                }
                var dataTask = result.Content.ReadAsAsync<T>();
                dataTask.Wait();
                T data = dataTask.Result;
                return data;
            }
        }

        public void DeleteBinding(Binding binding)
        {
            if (binding == null)
            {
                throw new ArgumentNullException("binding");
            }

            string pathTemplate = string.Empty;
            if (binding.destination_type == "exchange")
            {
                pathTemplate = "bindings/{0}/e/{1}/e/{2}/{3}";
            }
            else
            {
                pathTemplate = "bindings/{0}/e/{1}/q/{2}/{3}";
            }
            string url = string.Format(pathTemplate, SanitiseVhostName(binding.vhost), binding.source,
                binding.destination, RecodeBindingPropertiesKey(binding.properties_key));

            string errorMessage = "Error deleting binding";
            DeleteResource(url, errorMessage);
        }

        private string RecodeBindingPropertiesKey(string propertiesKey)
        {
            if (string.IsNullOrEmpty(propertiesKey)) return String.Empty;
            return propertiesKey.Replace("%5F", "%255F");
        }

        private void CreateExchange(string exchangeName, ExchangeInfo exchangeInfo, string vhostName)
        {
            var baseUrl = GetBaseUrl();
            var url = string.Format("exchanges/{0}/{1}", GetVhostName(vhostName), exchangeName);
            using (var client = new HttpClient())
            {
                SetDefaultValues(client, baseUrl);
                var res = client.PutAsJsonAsync(url, exchangeInfo);
                res.Wait();
                if (!res.Result.IsSuccessStatusCode)
                {
                    throw new Exception(string.Format("Error creating Exchange. ResponseCode: {0}. Reason: {1}", res.Result.StatusCode, res.Result.ReasonPhrase));
                }
            }
        }

        public void CreateQueue(string queueName, string vhostName = "")
        {
            var info = new QueueInfo()
                            .SetAutoDeleteOff()
                            .SetDurableOn();
            CreateQueue(queueName, info, vhostName);
        }

        private void CreateQueue(string queueName, QueueInfo queueInfo, string vhostName)
        {
            var baseUrl = GetBaseUrl();
            var url = string.Format("queues/{0}/{1}", GetVhostName(vhostName), queueName);

            using (var client = new HttpClient())
            {
                SetDefaultValues(client, baseUrl);

                var res = client.PutAsJsonAsync(url, queueInfo);
                res.Wait();
                if (!res.Result.IsSuccessStatusCode)
                {
                    throw new Exception(string.Format("Error creating Queue. ResponseCode: {0}. Reason: {1}", res.Result.StatusCode, res.Result.ReasonPhrase));
                }
            }
        }

        public void CreateShortlivedQueue(string queueName, int timeToLiveInMilliseconds, bool durable = false, string vhostName = "")
        {
            var info = new QueueInfo()
                            .SetAutoDeleteOff()
                            .SetDurableOff();
            if (durable)
            {
                info.SetDurableOn();
            }
            info.arguments.Add("x-expires", timeToLiveInMilliseconds);

            CreateQueue(queueName, info, vhostName);
        }

        public void CreateDirectBindingBetweenExchangeAndQueue(string exchangeName, string queueName, string vhostName = "")
        {
            const string routingKeyforAll = "#";
            CreateBindingBetweenExchangeAndQueue(exchangeName, queueName, routingKeyforAll, vhostName);
        }

        public void CreateBindingBetweenExchangeAndQueue(string exchangeName, string queueName, string routingKey, string vhostName = "")
        {
            var url = string.Format("bindings/{0}/e/{1}/q/{2}", GetVhostName(vhostName), exchangeName, queueName);
            CreateBinding(url, routingKey, vhostName);
        }

        private void CreateBinding(string url, string routingKey, string vhostName)
        {
            var baseUrl = GetBaseUrl();
            var info = new BindingInfo(routingKey);
            using (var client = new HttpClient())
            {
                SetDefaultValues(client, baseUrl);
                var res = client.PostAsJsonAsync(url, info);
                res.Wait();
                if (!res.Result.IsSuccessStatusCode)
                {
                    throw new Exception(string.Format("Error creating Binding. ResponseCode: {0}. Reason: {1}", res.Result.StatusCode, res.Result.ReasonPhrase));
                }
            }
        }

        public void CreateBindingBetweenTwoExchanges(string fromExchangeName, string toExchangeName, string routingKey, string vhostName = "")
        {
            var url = string.Format("bindings/{0}/e/{1}/e/{2}", GetVhostName(vhostName), fromExchangeName, toExchangeName);
            CreateBinding(url, routingKey, vhostName);
        }

        public void CreateUser(string username, string password)
        {
            var baseUrl = GetBaseUrl();
            var url = string.Format("users/{0}", username);
            var info = new UserInfo(password);

            using (var client = new HttpClient())
            {
                SetDefaultValues(client, baseUrl);
                var res = client.PutAsJsonAsync(url, info);
                res.Wait();
                if (!res.Result.IsSuccessStatusCode)
                {
                    throw new Exception(string.Format("Error creating User. ResponseCode: {0}. Reason: {1}", res.Result.StatusCode, res.Result.ReasonPhrase));
                }
            }
        }

        public void CreateUserPermission(string username, PermissionInfo permissionInfo, string vhostName = "")
        {
            var baseUrl = GetBaseUrl();
            var url = string.Format("/api/permissions/{0}/{1}", GetVhostName(vhostName), username);

            using (var client = new HttpClient())
            {
                SetDefaultValues(client, baseUrl);
                var res = client.PutAsJsonAsync(url, permissionInfo);
                res.Wait();
                if (!res.Result.IsSuccessStatusCode)
                {
                    throw new Exception(string.Format("Error creating Permission. ResponseCode: {0}. Reason: {1}", res.Result.StatusCode, res.Result.ReasonPhrase));
                }
            }
        }

        public void CreateTopicPermission(string username, TopicPermissionInfo topicPermissionInfo, string vhostName = "")
        {
            var baseUrl = GetBaseUrl();
            var url = string.Format("/api/topic-permissions/{0}/{1}", GetVhostName(vhostName), username);

            using (var client = new HttpClient())
            {
                SetDefaultValues(client, baseUrl);
                var res = client.PutAsJsonAsync(url, topicPermissionInfo);
                res.Wait();
                if (!res.Result.IsSuccessStatusCode)
                {
                    throw new Exception(string.Format("Error creating Topic Permission. ResponseCode: {0}. Reason: {1}", res.Result.StatusCode, res.Result.ReasonPhrase));
                }
            }
        }

        private string GetVhostName(string vhostName)
        {
            string vHostNameToReturn = "";
            if (string.IsNullOrEmpty(vhostName))
            {
                vHostNameToReturn = _defaultVhostName;
            }
            else
            {
                vHostNameToReturn = vhostName;
            }
            return SanitiseVhostName(vHostNameToReturn);
        }

        private void SetDefaultValues(HttpClient client, string baseUrl)
        {
            client.DefaultRequestHeaders.Authorization = GetAuthenticationHeader();
            client.BaseAddress = new Uri(baseUrl);
            client.DefaultRequestHeaders.Accept.Clear();
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }

        private AuthenticationHeaderValue GetAuthenticationHeader()
        {
            return new AuthenticationHeaderValue("Basic", Convert.ToBase64String(System.Text.Encoding.ASCII.GetBytes(string.Format("{0}:{1}", _username, _password))));
        }

        private string GetBaseUrl()
        {
            return string.Format("{0}://{1}:{2}/api/", GetScheme(_useHttps), _hostname, _portNumber);
        }

        private string GetScheme(bool useHttps)
        {
            if (useHttps)
            {
                return "https";
            }
            else
            {
                return "http";
            }
        }

        private static string SanitiseVhostName(string vhostName)
        {
            return vhostName.Replace("/", "%2f");
        }
    }
}
