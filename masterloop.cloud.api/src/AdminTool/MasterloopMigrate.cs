using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading;
using Masterloop.Cloud.BusinessLayer.Managers;
using Masterloop.Cloud.BusinessLayer.Managers.Interfaces;
using Masterloop.Cloud.BusinessLayer.Services.RMQ;
using Masterloop.Cloud.Core.Security;
using Masterloop.Cloud.Storage.Providers;
using Masterloop.Cloud.Storage.Repositories;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Devices;
using Masterloop.Core.Types.Settings;
using Masterloop.Plugin.Application;

namespace Masterloop.Tools.AdminTool
{
    public class MasterloopMigrate
    {
        private string _mcs4Host, _mcs4User, _mcs4Pass;
        private string _rmqCon, _redisCon, _postgresCon;
        private MasterloopServerConnection _mcs;
        private ITenantRepository _tenantRepo;
        private IUserRepository _userRepo;
        private ITemplateRepository _templateRepo;
        private IDeviceRepository _deviceRepo;
        private ISettingsRepository _settingsRepo;
        private ITenantManager _tenantMgr;

        public MasterloopMigrate(string mcs4Host, string mcs4User, string mcs4Pass, string rmqCon, string redisCon, string postgresCon)
        {
            _mcs4Host = mcs4Host;
            _mcs4User = mcs4User;
            _mcs4Pass = mcs4Pass;
            _rmqCon = rmqCon;
            _redisCon = redisCon;
            _postgresCon = postgresCon;

            _mcs = new MasterloopServerConnection(mcs4Host, mcs4User, mcs4Pass);

            ICacheProvider cacheProvider = ProviderFactory.GetCacheProvider(CacheProviderTypes.Redis, redisCon);
            _tenantRepo = new TenantRepository(cacheProvider);
            _userRepo = new UserRepository(cacheProvider);
            _templateRepo = new TemplateRepository(cacheProvider);
            _deviceRepo = new DeviceRepository(cacheProvider);
            _settingsRepo = new SettingsRepository(cacheProvider);

            _tenantMgr = new TenantManager(_tenantRepo, _userRepo);
        }

        public void CreateTenant(string name)
        {
            _tenantMgr.CreateTenant(name);
        }

        public void MigrateUsers()
        {
            //TODO: Get Users from 4.6 based MCS.
            //TODO: Insert Users into 5.x based MCS.
        }

        public void AddTenantAccount(int tenantId, string accountId)
        {
            TenantPermission permission = new TenantPermission(accountId, tenantId, true, true, true);
            _tenantRepo.SetTenantPermission(permission);
        }

        public void MigrateTemplate(string tid, int tenantId)
        {
            // Get Template details from 4.6 based MCS.
            Trace.TraceInformation($"Getting {tid} details from {_mcs4Host} with user {_mcs4User}.");
            DeviceTemplate template = _mcs.GetTemplate(tid);

            if (template != null)
            {
                // Insert Template into 5.x based MCS.
                Trace.TraceInformation($"Inserting template {tid} in template repository.");
                _templateRepo.Create(template);

                Trace.TraceInformation($"Adding template {tid} to tenant id {tenantId}.");
                _tenantRepo.AddTenantTemplate(tenantId, template.Id);
            }
            else
            {
                Trace.TraceError($"Failed to get template details for template {tid}");
            }
        }

        public void MigrateFirmwares()
        {
            //TODO: For each Template
                //TODO: Get Firmwares from 4.6 based MCS.
                //TODO: Insert Firmwares into 5.x based MCS.
        }

        public void MigrateDevices(string tid, int sleepInterval)
        {
            // Get Devices from 4.6 based MCS.
            Trace.TraceInformation($"Getting devices for template {tid}.");
            Device[] devices = _mcs.GetTemplateDevices(tid);

            // For each Device
            if (devices != null && devices.Length > 0)
            {
                int counter = 1;
                foreach (Device device in devices)
                {
                    Trace.TraceInformation($"Inserting device {device.MID}   ({counter++} of {devices.Length}):");

                    // Get secure detailed device
                    SecureDetailedDevice secureDetailedDevice = _mcs.GetSecureDeviceDetails(device.MID);

                    if (secureDetailedDevice != null)
                    {
                        // Insert Device into 5.x based MCS.
                        if (_deviceRepo.Create(secureDetailedDevice) == secureDetailedDevice.MID)
                        {
                            Trace.TraceInformation("  Device successfully migrated.");
                        }
                        else
                        {
                            Trace.TraceError($"  Failed to create device {secureDetailedDevice.MID}.");
                        }
                    }
                    else
                    {
                        Trace.TraceError($"  Failed to get secure device details for device {device.MID}.");
                    }
                    Thread.Sleep(sleepInterval);
                }
            }
            else
            {
                Trace.TraceError($"Failed to get any devices for template {tid} using username {_mcs4User}.");
            }
        }

        public void MigrateDevicesByFile(string tid, string filename)
        {
            // Get Devices from 4.6 based MCS.
            Trace.TraceInformation($"Getting devices for template {tid} from file {filename}.");

            List<string> mids = new List<string>();
            using (StreamReader file = new StreamReader(filename))
            {
                string mid;
                while ((mid = file.ReadLine()) != null)
                {
                    mids.Add(mid);
                }
            }


            // For each Device
            int counter = 1;
            foreach (string mid in mids)
            {
                Trace.TraceInformation($"Inserting device {mid}   ({counter++} of {mids.Count}):");

                // Get secure detailed device
                SecureDetailedDevice secureDetailedDevice = _mcs.GetSecureDeviceDetails(mid);

                if (secureDetailedDevice != null)
                {
                    // Substitute template id to target template id.
                    secureDetailedDevice.TemplateId = tid;

                    // Insert Device into 5.x based MCS.
                    if (_deviceRepo.Create(secureDetailedDevice) == secureDetailedDevice.MID)
                    {
                        Trace.TraceInformation("  Device successfully migrated.");
                    }
                    else
                    {
                        Trace.TraceError($"  Failed to create device {secureDetailedDevice.MID}.");
                    }
                }
                else
                {
                    Trace.TraceError($"  Failed to get secure device details for device {mid}.");
                }
            }
        }

        public void MigrateDeviceSettings(string tid, int sleepInterval)
        {
            // Get Devices from 4.6 based MCS.
            Trace.TraceInformation($"Getting devices for template {tid}.");
            Device[] devices = _mcs.GetTemplateDevices(tid);

            // For each Device
            if (devices != null && devices.Length > 0)
            {
                int counter = 1;
                foreach (Device device in devices)
                {
                    // Get secure detailed device
                    Trace.TraceInformation($"Getting settings for device {device.MID}   ({counter++} of {devices.Length}):");
                    ExpandedSettingsPackage esp = _mcs.GetSettings(device.MID);
                    List<SettingValue> settingValues = new List<SettingValue>();
                    if (esp.Values != null && esp.Values.Length > 0)
                    {
                        foreach (var sv in esp.Values)
                        {
                            if (!sv.IsDefaultValue)
                            {
                                settingValues.Add(new SettingValue() { Id = sv.Id, Value = sv.Value });
                            }
                        }
                    }

                    // Insert Settings into 5.x based MCS.
                    SettingsPackage sp = new SettingsPackage()
                    {
                        MID = esp.MID,
                        LastUpdatedOn = DateTime.UtcNow,
                        Values = settingValues.ToArray()
                    };
                    if (_settingsRepo.Create(sp) == device.MID)
                    {
                        Trace.TraceInformation("  Device settings migrated.");
                    }
                    else
                    {
                        Trace.TraceError("  Failed to migrate settings.");
                    }
                    Thread.Sleep(sleepInterval);
                }
            }
            else
            {
                Trace.TraceError($"Failed to get any devices for template {tid} using username {_mcs4User}.");
            }
        }

        public void MigrateObservations(string mid)
        {
            //TODO: Get Observation history
            //TODO: Insert Observations into 5.x based MCS via live system.
        }

        public void MigrateCommands(string mid)
        {
            //TODO: Get Command history
            //TODO: Insert Commands into 5.x based MCS via live system.
        }

        public void MigratePulses(string mid)
        {
            //TODO: Get Pulse history
            //TODO: Insert Pulses into 5.x based MCS via live system.
        }

        public void MigrateDeviceEvents(string mid)
        {
            //TODO: Get DeviceEvent history
            //TODO: Insert DeviceEvents into 5.x based MCS via live system.
        }

        public void RMQImportTemplate(string tid)
        {
            MasterloopServerConnection mcs = new MasterloopServerConnection(_mcs4Host, _mcs4User, _mcs4Pass);
            IRMQAdminClient rmqAdminClient = new RMQAdminClient(_rmqCon);
            var template = mcs.GetTemplate(tid);
            TemplateManager tMgr = new TemplateManager(null, null, rmqAdminClient, null);
            tMgr.CreateRMQTemplate(template.Id);
        }

        public void RMQImportDevicesByTemplate(string templateId, DeviceProtocolType protocol)
        {
            MasterloopServerConnection mcs = new MasterloopServerConnection(_mcs4Host, _mcs4User, _mcs4Pass);
            ICacheProvider cacheProvider = ProviderFactory.GetCacheProvider(CacheProviderTypes.Redis, _redisCon);
            IDeviceRepository deviceRepo = new DeviceRepository(cacheProvider);
            IRMQAdminClient rmqAdminClient = new RMQAdminClient(_rmqCon);
            DeviceManager dMgr = new DeviceManager(null, null, null, null, rmqAdminClient, null);

            var devices = mcs.GetTemplateDevices(templateId);
            if (devices == null)
            {
                Trace.TraceWarning("Null devices");
                return;
            }
            int i = 0;
            List<Device> deviceList = new List<Device>(devices);
            while (deviceList.Count > 0)
            {
                DateTime t = DateTime.UtcNow;
                var device = deviceList[0];
                try
                {
                    Trace.Write($"{DateTime.UtcNow:O} - {i + 1};{devices.Count()};{device.MID}... ");
                    var secureDevice = deviceRepo.Get(device.MID);
                    if (secureDevice != null)
                    {
                        dMgr.RMQCreateDevice(device.TemplateId, device.MID, secureDevice.PreSharedKey, protocol);
                        deviceList.RemoveAt(0);
                        i++;
                        Trace.Write("OK");
                    }
                    else
                    {
                        Trace.TraceWarning("Failed to get secure device details, retrying.");
                    }
                }
                catch (Exception e)
                {
                    Trace.TraceError($"{DateTime.UtcNow:O} - FAILED;{device.MID};{e.Message}");
                }
                TimeSpan ts = DateTime.UtcNow - t;
                Trace.TraceInformation($" ({ts.TotalMilliseconds} ms)");
            }
        }

        public void RMQImportTemplateDevicesByFile(string templateId, string filename, DeviceProtocolType protocol)
        {
            MasterloopServerConnection mcs = new MasterloopServerConnection(_mcs4Host, _mcs4User, _mcs4Pass);
            ICacheProvider cacheProvider = ProviderFactory.GetCacheProvider(CacheProviderTypes.Redis, _redisCon);
            IDeviceRepository deviceRepo = new DeviceRepository(cacheProvider);
            IRMQAdminClient rmqAdminClient = new RMQAdminClient(_rmqCon);
            DeviceManager dMgr = new DeviceManager(null, null, null, null, rmqAdminClient, null);

            List<string> mids = new List<string>();
            using (StreamReader file = new StreamReader(filename))
            {
                string mid;
                while ((mid = file.ReadLine()) != null)
                {
                    mids.Add(mid);
                }
            }

            int i = 0;
            while (mids.Count > 0)
            {
                DateTime t = DateTime.UtcNow;
                string mid = mids[0];
                try
                {
                    Trace.Write($"{DateTime.UtcNow:O} - {i + 1};{mids.Count};{mid}... ");
                    SecureDetailedDevice secureDevice = mcs.GetSecureDeviceDetails(mid);
                    if (secureDevice != null)
                    {
                        dMgr.RMQCreateDevice(templateId, secureDevice.MID, secureDevice.PreSharedKey, protocol);
                        mids.RemoveAt(0);
                        i++;
                        Trace.Write("OK");
                    }
                    else
                    {
                        Trace.TraceWarning("FAILED, retrying.");
                    }
                }
                catch (Exception e)
                {
                    Trace.TraceError($"{DateTime.UtcNow:O} - Exception;{mid};{e.Message}");
                }
                TimeSpan ts = DateTime.UtcNow - t;
                Trace.TraceInformation($" ({ts.TotalMilliseconds} ms)");
            }
        }

        public void RMQCreateDeviceAccount(string mid, DeviceProtocolType protocol)
        {
            MasterloopServerConnection mcs = new MasterloopServerConnection(_mcs4Host, _mcs4User, _mcs4Pass);
            ICacheProvider cacheProvider = ProviderFactory.GetCacheProvider(CacheProviderTypes.Redis, _redisCon);
            IRMQAdminClient rmqAdminClient = new RMQAdminClient(_rmqCon);
            DeviceManager dMgr = new DeviceManager(null, null, null, null, rmqAdminClient, null);
            SecureDetailedDevice secureDevice = mcs.GetSecureDeviceDetails(mid);
            if (secureDevice != null)
            {
                dMgr.RMQCreateDeviceAccount(mid, secureDevice.PreSharedKey, protocol);
            }
        }
    }
}
