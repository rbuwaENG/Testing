using System;

namespace Masterloop.Cloud.Core.RMQ
{
    public class RMQNameProvider
    {
        public static string CreateTemplatePubExchangeName(string TID)
        {
            return $"TP.{TID}.X";
        }

        public static string CreateTemplateSubExchangeName(string TID)
        {
            return $"TS.{TID}.X";
        }

        public static string CreateDeviceExchangeName(string MID)
        {
            return $"{MID}.X";
        }

        public static string CreateDeviceAMQPQueueName(string MID)
        {
            return $"{MID}.Q";
        }

        public static string CreateDeviceMQTTQueueName(string MID)
        {
            return $"mqtt-subscription-{MID}qos1";
        }

        public static string CreateDeviceMQTTSubscribeTopic(string MID)
        {
            return $"{MID}/";
        }

        public static string CreateDeviceMQTTPublishTopic(string MID)
        {
            return $"{MID}/";
        }

        public static string CreateUserExchangeName(string userId)
        {
            return $"{userId}.X";
        }

        public static string GetRootExchangeName()
        {
            return "root.topic";
        }

        public static string GetMqttExchangeName()
        {
            return "mqtt.topic";
        }

        public static string GetMqttOutboxExchangeName()
        {
            return "mqtt-outbox.topic";
        }

        public static string GetMqttInboxExchangeName()
        {
            return "mqtt-inbox.topic";
        }

        public static string GetTemporaryExchangeName(string userId, Guid guid)
        {
            return $"{userId}@@@{guid}.X";
        }

        public static string GetTemporaryQueueName(string userId, Guid guid)
        {
            return $"{userId}@@@{guid}.Q";
        }

        public static string GetWhitelistExchangeName(string userId, string subscriptionKey)
        {
            return $"{userId}@@@{subscriptionKey}.W";
        }

        public static string GetPersistentExchangeName(string userId, string subscriptionKey)
        {
            return $"{userId}@@@{subscriptionKey}.X";
        }

        public static string GetPersistentQueueName(string userId, string subscriptionKey)
        {
            return $"{userId}@@@{subscriptionKey}.Q";
        }
    }
}
