using System;
using System.Collections.Generic;
using System.Linq;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.BusinessLayer.Services.Security;
using Masterloop.Cloud.Core.Dashboard;
using Masterloop.Cloud.Storage.Repositories.Interfaces;

namespace Masterloop.Cloud.BusinessLayer.Managers
{
    public class DashboardManager : IDashboardManager
    {
        private readonly IDashboardRepository _dashboardRepository;

        public DashboardManager(IDashboardRepository dashboardRepsitory)
        {
            _dashboardRepository = dashboardRepsitory;
        }

        public TemplateDashboard GetTemplateDashboard(string tid, string did)
        {
            return _dashboardRepository.GetTemplateDashboard(tid, did);
        }

        public TemplateDashboard[] GetTemplateDashboards(string tid)
        {
            IEnumerable<TemplateDashboard> dashboards = _dashboardRepository.GetAllTemplateDashboards(tid);
            if (dashboards != null)
            {
                return dashboards.Cast<TemplateDashboard>().ToArray();
            }
            else
            {
                return null;
            }
        }

        public string CreateTemplateDashboard(string tid, TemplateDashboard dashboard)
        {
            dashboard.Id = PasswordGenerator.GenerateSafeGuidString();
            return _dashboardRepository.CreateTemplateDashboard(tid, dashboard);
        }

        public bool UpdateTemplateDashboard(string tid, TemplateDashboard dashboard)
        {
            return _dashboardRepository.UpdateTemplateDashboard(tid, dashboard);
        }

        public bool DeleteTemplateDashboard(string tid, string did)
        {
            return _dashboardRepository.DeleteTemplateDashboard(tid, did);
        }
    }
}