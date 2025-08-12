using System.Collections.Generic;

namespace Masterloop.Cloud.Storage.Repositories.Interfaces
{
    public interface IRepository<TEntity, TId> where TEntity : new()
    {
        TEntity Get(TId id);
        IEnumerable<TEntity> GetAll();
        TId Create(TEntity entity);
        bool Update(TEntity entity);
        bool Delete(TId id);
    }
}