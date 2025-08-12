namespace Masterloop.Cloud.BusinessLayer.Services.RMQ
{
    public interface IRMQCleanerService
    {
        int CleanupUnusedUsers();
        int CleanupUnusedExchanges();
        int CleanupUnusedExchangesAndUsers();
    }
}