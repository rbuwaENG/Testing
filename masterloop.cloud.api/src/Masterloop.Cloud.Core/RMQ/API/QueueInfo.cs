using System;

namespace Masterloop.Cloud.Core.RMQ.API
{
    public class QueueInfo
    {
        public bool auto_delete { get; private set; }
        public bool durable { get; private set; }
        public InputArguments arguments { get; private set; }

        public QueueInfo(bool autoDelete, bool durable, InputArguments arguments)
        {   
            if (arguments == null)
            {
                throw new ArgumentNullException("arguments");
            }

            auto_delete = autoDelete;
            this.durable = durable;
            this.arguments = arguments;
        }

        public QueueInfo() :
            this(false, true, new InputArguments())
        {
        }

        public QueueInfo SetDurableOn()
        {
            durable = true;
            return this;
        }

        public QueueInfo SetDurableOff()
        {
            durable = false;
            return this;
        }

        public QueueInfo SetAutoDeleteOn()
        {
            auto_delete = true;
            return this;
        }

        public QueueInfo SetAutoDeleteOff()
        {
            auto_delete = false;
            return this;
        }
    }


}
