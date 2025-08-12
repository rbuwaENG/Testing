namespace Masterloop.Cloud.Storage.Providers
{
    public class RedisTables
    {
        public const int Indexes = 0;           // Indexes of entities

        public const int Template = 1;          // Template details

        public const int ObservationCurrent = 2;  // Current observation values

        public const int Device = 3;            // Device details

        public const int Tenant = 4;            // Tenant details

        public const int User = 5;              // User details

        public const int Settings = 6;          // Device settings

        public const int Pulse = 7;             // Current pulse period

        public const int TemplateDevices = 8;   // Template->Devices maps

        public const int TenantUsers = 9;       // Tenant->Users maps

        public const int TenantTemplates = 10;  // Tenant->Templates maps

        public const int NodeConfigs = 11;      // Node configuration

        public const int Dashboard = 12;        // Dashboards

        public const int ObservationHistory = 13;  // Observation historian values
    }

    public class RedisIndexes
    {
        public const string AllDevices = "AllDevices";

        public const string AllTenants = "AllTenants";

        public const string AllUsers = "AllUsers";
    }
}