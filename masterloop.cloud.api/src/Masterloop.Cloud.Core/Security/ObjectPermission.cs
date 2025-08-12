namespace Masterloop.Cloud.Core.Security
{
    public class ObjectPermission
    {
        public ObjectPermission(bool canObserve, bool canControl, bool canAdmin)
        {
            this.CanObserve = canObserve;
            this.CanControl = canControl;
            this.CanAdmin = canAdmin;
        }

        public readonly bool CanObserve;

        public readonly bool CanControl;

        public readonly bool CanAdmin;
    }
}
