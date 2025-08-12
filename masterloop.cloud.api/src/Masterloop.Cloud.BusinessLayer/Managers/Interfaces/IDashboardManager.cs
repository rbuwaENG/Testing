using System;
using Masterloop.Cloud.Core.Dashboard;

namespace Masterloop.Cloud.BusinessLayer.Managers.Interfaces
{
    public interface IDashboardManager
    {
        TemplateDashboard GetTemplateDashboard(string tid, string did);
        TemplateDashboard[] GetTemplateDashboards(string tid);
        string CreateTemplateDashboard(string tid, TemplateDashboard dashboard);
        bool UpdateTemplateDashboard(string tid, TemplateDashboard dashboard);
        bool DeleteTemplateDashboard(string tid, string did);
    }
}