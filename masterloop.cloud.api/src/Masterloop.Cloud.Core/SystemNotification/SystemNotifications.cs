namespace Masterloop.Cloud.Core.SystemNotification
{
    public class SystemNotification
    {
    }

    public class SystemNotificationTemplateChanged : SystemNotification
    {
        public string TID { get; set; }
    }

    public class SystemNotificationDeviceTemplateChanged : SystemNotification
    {
        public string MID { get; set; }
        public string FromTID { get; set; }
        public string ToTID { get; set; }
    }
}