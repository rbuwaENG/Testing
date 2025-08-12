using System;
using Masterloop.Core.Types.Base;
using Masterloop.Core.Types.Observations;

namespace Masterloop.Cloud.BusinessLayer.Services.Observations
{
	public class RunningStatistics : DescriptiveStatistics
	{
        private double _oldM, _newM;

        public RunningStatistics()
        {
        }

        public RunningStatistics(DescriptiveStatistics stats)
        {
            this.Count = stats.Count;
            this.Mean = stats.Mean;
            this.Minimum = stats.Minimum;
            this.Maximum = stats.Maximum;
            this.From = stats.From;
            this.To = stats.To;
            _oldM = _newM = this.Mean;
        }

        public void Push(double x)
		{
            this.Count++;

            // See Knuth TAOCP vol 2, 3rd edition, page 232
            if (this.Count == 1)
            {
                _oldM = _newM = x;
                this.Maximum = x;
                this.Minimum = x;
            }
            else
            {
                _newM = _oldM + (x - _oldM) / this.Count;

                // set up for next iteration
                _oldM = _newM;

                if (x > this.Maximum) this.Maximum = x;
                if (x < this.Minimum) this.Minimum = x;
            }
            this.Mean = _newM;
        }
	}
}

