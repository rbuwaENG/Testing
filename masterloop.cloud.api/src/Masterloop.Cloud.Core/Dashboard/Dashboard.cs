using System;
namespace Masterloop.Cloud.Core.Dashboard
{
    public class Dashboard
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public int Index { get; set; }
        public int? Rows { get; set; }
        public int? Columns { get; set; }
        public bool IsLive { get; set; }
    }
}

