using System;
using System.Collections.Generic;
using Masterloop.Cloud.Core.Dashboard;

namespace Masterloop.Cloud.Storage.Repositories.Interfaces
{
    public interface IDashboardRepository : IRepository<Dashboard, string>
    {
        TemplateDashboard GetTemplateDashboard(string tid, string did);
        IEnumerable<TemplateDashboard> GetAllTemplateDashboards(string tid);
        string CreateTemplateDashboard(string tid, TemplateDashboard dashboard);
        bool UpdateTemplateDashboard(string tid, TemplateDashboard entity);
        bool DeleteTemplateDashboard(string tid, string did);
    }
}