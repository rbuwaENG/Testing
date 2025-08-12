using System;
namespace Masterloop.Cloud.Core.Dashboard
{
    public class DashboardObservation
    {
        public int Id { get; set; }
        public DashboardTimespan Timespan { get; set; }
        public DashboardWidget Widget { get; set; }
        public DashboardPlacement Placement { get; set; }
        public DashboardStyle Style { get; set; }
        public bool UseLocalTime { get; set; }
   }
}