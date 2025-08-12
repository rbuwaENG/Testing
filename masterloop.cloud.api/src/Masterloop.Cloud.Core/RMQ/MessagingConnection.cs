using System;

namespace Masterloop.Cloud.Core.RMQ
{
    public class MessagingConnection
    {
        public string HostName { get; set; }
        public string Username { get; set; }
        public string Password { get; set; }
        public bool Encrypted { get; set; }
        public ushort Port { get; set; }
        public string VHost { get; set; }

        public MessagingConnection(string connectionString)
        {
            if (connectionString != null)
            {
                string[] args = connectionString.Split(',');
                if (args.Length == 6)
                {
                    HostName = args[0];
                    Username = args[1];
                    Password = args[2];
                    Encrypted = Boolean.Parse(args[3]);
                    Port = UInt16.Parse(args[4]);
                    VHost = args[5];
                }
                else if (args.Length == 5)
                {
                    HostName = args[0];
                    Username = args[1];
                    Password = args[2];
                    Encrypted = Boolean.Parse(args[3]);
                    Port = UInt16.Parse(args[4]);
                    VHost = "/";
                }
                else if (args.Length == 4)
                {
                    HostName = args[0];
                    Username = args[1];
                    Password = args[2];
                    Encrypted = Boolean.Parse(args[3]);
                    Port = (ushort) (Encrypted ? 15671 : 15672);
                    VHost = "/";
                }
                else if (args.Length == 3)
                {
                    HostName = args[0];
                    Username = args[1];
                    Password = args[2];
                    Encrypted = true;
                    Port = 15671;
                    VHost = "/";
                }
                else
                {
                    throw new ArgumentException("MessagingConnection connection string must be on the form \"<hostname>,<username>,<password>[,encrypted][,Port][,VHost]\".");
                }
            }
            else
            {
                throw new ArgumentException("RabbitMqManagementClient connection string cannot be empty.");
            }
        }
    }
}
