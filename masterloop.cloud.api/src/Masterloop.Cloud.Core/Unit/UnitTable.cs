using System;

namespace Masterloop.Cloud.Core.Unit
{
    public class UnitTable
    {
        public DateTime RevisionDate { get; set; }
        public QuantityItem[] Quantities { get; set; }
    }
}