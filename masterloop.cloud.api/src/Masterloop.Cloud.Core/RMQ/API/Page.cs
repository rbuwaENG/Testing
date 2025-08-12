using System.Collections.Generic;

namespace Masterloop.Cloud.Core.RMQ.API
{
    public class Page<T>
    {
        public long filtered_count { get; set; }
        public long item_count { get; set; }
        public IEnumerable<T> items { get; set; }
        public long page { get; set; }
        public long page_count { get; set; }
        public long page_size { get; set; }
        public long total_count { get; set; }
  }
}
