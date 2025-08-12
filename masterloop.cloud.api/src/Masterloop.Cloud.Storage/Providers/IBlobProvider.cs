using System;
using StackExchange.Redis;

namespace Masterloop.Cloud.Storage.Providers
{
    public interface IBlobProvider
    {
        string ConnectionString { get; }
        byte[] GetBlob(string path);
        bool SetBlob(string path, byte[] data, string contentType);
        bool AppendBlobData(string path, byte[] data);
        bool InsertBlobData(string path, byte[] data, int position);
    }
}

