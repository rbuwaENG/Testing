using System;
using System.Collections.Generic;

namespace Masterloop.Cloud.Core.RMQ.API
{
    public class ExchangeInfo
    {
        public string type { get; set; }
        public bool auto_delete { get; set; }
        public bool durable { get; set; }

        public bool @internal { get; set; }

        public Arguments arguments { get; set; }

        private readonly ISet<string> exchangeTypes = new HashSet<string>
        {
            "direct", "topic", "fanout", "headers"
        };

        public ExchangeInfo()
            : this("topic", false, true, new Arguments())
        {
        }

        public ExchangeInfo(string type)
            : this(type, false, true, new Arguments())
        {
        }


        public ExchangeInfo(string type, bool autoDelete, bool durable, Arguments arguments)
        {   
            if (type == null)
            {
                throw new ArgumentNullException("type");
            }
            if (!exchangeTypes.Contains(type))
            {
                throw new ArgumentNullException("type", string.Format("Unknown exchange type '{0}', expected one of {1}",
                    type,
                    string.Join(", ", exchangeTypes)));
            }

            this.type = type;
            auto_delete = autoDelete;
            this.durable = durable;
            this.arguments = arguments;
            @internal = false;
        }

        public ExchangeInfo SetDurableOn()
        {
            durable = true;
            return this;
        }

        public ExchangeInfo SetDurableOff()
        {
            durable = false;
            return this;
        }

        public ExchangeInfo SetAutoDeleteOn()
        {
            auto_delete = true;
            return this;
        }

        public ExchangeInfo SetAutoDeleteOff()
        {
            auto_delete = false;
            return this;
        }

        public ExchangeInfo SetToTopicType()
        {
            type = "topic";
            return this;
        }

        public ExchangeInfo SetToFanoutType()
        {
            type = "fanout";
            return this;
        }

        public ExchangeInfo SetToInternal()
        {
            @internal = true;
            return this;
        }

    }
}
