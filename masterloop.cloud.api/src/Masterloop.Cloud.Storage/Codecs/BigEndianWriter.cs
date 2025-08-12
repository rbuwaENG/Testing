using System;
using System.IO;

namespace Masterloop.Cloud.Storage.Codecs
{
    public class BigEndianWriter : IDisposable
    {
        private BinaryWriter _baseWriter;

        public BigEndianWriter(BinaryWriter baseWriter)
        {
            _baseWriter = baseWriter;
        }

        #region Dispose
        // Flag: Has Dispose already been called? 
        private bool disposed = false;

        // Public implementation of Dispose pattern callable by consumers. 
        public void Dispose()
        { 
            Dispose(true);
            GC.SuppressFinalize(this);           
        }

        // Protected implementation of Dispose pattern. 
        protected virtual void Dispose(bool disposing)
        {
            if (disposed)
                return; 

            if (disposing)
            {
                Close();
            }

            disposed = true;
        }

        ~BigEndianWriter()
        {
            Dispose(false);
        }
        #endregion

        public void WriteByte(byte value)
        {
            _baseWriter.Write(value);
        }

        public void WriteSByte(sbyte value)
        {
            _baseWriter.Write(value);
        }

        public void WriteBytes(byte[] bytes)
        {
            _baseWriter.Write(bytes);
        }

        public void WriteInt16(Int16 value)
        {
            WriteBigEndianBytes(BitConverter.GetBytes(value));
        }

        public void WriteUInt16(UInt16 value)
        {
            WriteBigEndianBytes(BitConverter.GetBytes(value));
        }

        public void WriteInt32(Int32 value)
        {
            WriteBigEndianBytes(BitConverter.GetBytes(value));
        }

        public void WriteUInt32(UInt32 value)
        {
            WriteBigEndianBytes(BitConverter.GetBytes(value));
        }

        public void WriteInt64(Int64 value)
        {
            WriteBigEndianBytes(BitConverter.GetBytes(value));
        }

        public void WriteUInt64(UInt64 value)
        {
            WriteBigEndianBytes(BitConverter.GetBytes(value));
        }

        public void WriteSingle(Single value)
        {
            WriteBigEndianBytes(BitConverter.GetBytes(value));
        }

        public void WriteDouble(Double value)
        {
            WriteBigEndianBytes(BitConverter.GetBytes(value));
        }

        public void WriteBigEndianBytes(byte[] bytes)
        {
            if (BitConverter.IsLittleEndian)
            {
                Array.Reverse(bytes);
            }
            _baseWriter.Write(bytes);
        }

        public void Close()
        {
            _baseWriter.Close();
        }

        public Stream BaseStream
        {
            get { return _baseWriter.BaseStream; }
        }
    }
}
