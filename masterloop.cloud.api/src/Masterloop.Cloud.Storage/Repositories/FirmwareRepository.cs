using System;
using System.Collections.Generic;
using System.Data;
using Dapper;
using Masterloop.Cloud.Storage.Providers;
using Masterloop.Cloud.Storage.Repositories.Interfaces;
using Masterloop.Core.Types.Firmware;

namespace Masterloop.Cloud.Storage.Repositories
{
    /// <summary>
    /// Repository for firmwares using PostgreSQL.
    /// </summary>
    public class FirmwareRepository : IFirmwareRepository
    {
        protected IDbProvider _dbProvider;

        public FirmwareRepository(IDbProvider dbProvider)
        {
            _dbProvider = dbProvider;
        }

        public int CreateRelease(FirmwareReleaseDescriptor frd, string templateId, byte[] firmwareData)
        {
            DynamicParameters prms = new DynamicParameters();
            string query = "INSERT INTO firmware_release(template_id,is_current,release_date,version_no,size,firmware_md5,firmware_data) " +
                           "VALUES(@template_id,@is_current,@release_date,@version_no,@size,@firmware_md5,@firmware_data) " +
                           "RETURNING id ";
            prms.Add("@template_id", templateId);
            prms.Add("@is_current", false);
            prms.Add("@release_date", frd.ReleaseDate);
            prms.Add("@version_no", frd.VersionNo);
            prms.Add("@size", frd.Size);
            prms.Add("@firmware_md5", frd.FirmwareMD5);
            prms.Add("@firmware_data", firmwareData);

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                return (int) dbConnection.ExecuteScalar(query, prms);
            }
        }

        public FirmwareReleaseDescriptor GetRelease(int releaseId)
        {
            string query = "SELECT id,release_date,version_no,size,firmware_md5 " +
                           "FROM firmware_release " +
                           "WHERE id=@id ";
            DynamicParameters prms = new DynamicParameters();
            prms.Add("@id", releaseId);

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                using (IDataReader reader = dbConnection.ExecuteReader(query, prms))
                {
                    if (reader.Read())
                    {
                        FirmwareReleaseDescriptor frd = new FirmwareReleaseDescriptor()
                        {
                            Id = reader.GetInt32(0),
                            ReleaseDate = new DateTime(reader.GetDateTime(1).Ticks, DateTimeKind.Utc),
                            VersionNo = reader.GetString(2),
                            Size = reader.GetInt32(3),
                            FirmwareMD5 = reader.GetString(4),
                        };
                        return frd;
                    }
                    else
                    {
                        return null;
                    }
                }
            }
        }

        public FirmwareReleaseDescriptor GetRelease(string templateId, string versionNo)
        {
            string query = "SELECT id,release_date,version_no,size,firmware_md5 " +
                           "FROM firmware_release " +
                           "WHERE template_id=@templateId AND version_no=@versionNo ";
            DynamicParameters prms = new DynamicParameters();
            prms.Add("@templateId", templateId);
            prms.Add("@versionNo", versionNo);

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                using (IDataReader reader = dbConnection.ExecuteReader(query, prms))
                {
                    if (reader.Read())
                    {
                        FirmwareReleaseDescriptor frd = new FirmwareReleaseDescriptor()
                        {
                            Id = reader.GetInt32(0),
                            ReleaseDate = new DateTime(reader.GetDateTime(1).Ticks, DateTimeKind.Utc),
                            VersionNo = reader.GetString(2),
                            Size = reader.GetInt32(3),
                            FirmwareMD5 = reader.GetString(4),
                        };
                        return frd;
                    }
                    else
                    {
                        return null;
                    }
                }
            }
        }

        public string GetReleaseTemplate(int releaseId)
        {
            string query = "SELECT template_id " +
                           "FROM firmware_release " +
                           "WHERE id=@id ";
            DynamicParameters prms = new DynamicParameters();
            prms.Add("@id", releaseId);

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                using (IDataReader reader = dbConnection.ExecuteReader(query, prms))
                {
                    if (reader.Read())
                    {
                        return reader.GetString(0);
                    }
                    else
                    {
                        return null;
                    }
                }
            }
        }

        public FirmwareReleaseDescriptor GetCurrentRelease(string templateId)
        {
            string query = "SELECT id,release_date,version_no,size,firmware_md5 " +
                           "FROM firmware_release " +
                           "WHERE template_id=@templateId AND is_current=true ";
            DynamicParameters prms = new DynamicParameters();
            prms.Add("@templateId", templateId);

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                using (IDataReader reader = dbConnection.ExecuteReader(query, prms))
                {
                    if (reader.Read())
                    {
                        FirmwareReleaseDescriptor frd = new FirmwareReleaseDescriptor()
                        {
                            Id = reader.GetInt32(0),
                            ReleaseDate = new DateTime(reader.GetDateTime(1).Ticks, DateTimeKind.Utc),
                            VersionNo = reader.GetString(2),
                            Size = reader.GetInt32(3),
                            FirmwareMD5 = reader.GetString(4),
                        };
                        return frd;
                    }
                    else
                    {
                        return null;
                    }
                }
            }
        }

        public bool SetCurrentRelease(string templateId, int releaseId)
        {
            DynamicParameters prms = new DynamicParameters();
            string query = "UPDATE firmware_release SET is_current=false WHERE template_id=@template_id AND is_current=true; " +
                           "UPDATE firmware_release SET is_current=true WHERE template_id=@template_id AND id=@id";
            prms.Add("@id", releaseId);
            prms.Add("@template_id", templateId);

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                dbConnection.Execute(query, prms);
                return true;
            }
        }

        public IEnumerable<FirmwareReleaseDescriptor> GetAllReleases(string templateId)
        {
            List<FirmwareReleaseDescriptor> releases = new List<FirmwareReleaseDescriptor>();

            string query = "SELECT id,release_date,version_no,size,firmware_md5 " +
                           "FROM firmware_release " +
                           "WHERE template_id=@templateId " +
                           "ORDER BY id";
            DynamicParameters prms = new DynamicParameters();
            prms.Add("@templateId", templateId);

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                using (IDataReader reader = dbConnection.ExecuteReader(query, prms))
                {
                    while (reader.Read())
                    {
                        FirmwareReleaseDescriptor frd = new FirmwareReleaseDescriptor()
                        {
                            Id = reader.GetInt32(0),
                            ReleaseDate = new DateTime(reader.GetDateTime(1).Ticks, DateTimeKind.Utc),
                            VersionNo = reader.GetString(2),
                            Size = reader.GetInt32(3),
                            FirmwareMD5 = reader.GetString(4),
                        };
                        releases.Add(frd);
                    }
                }
            }
            return releases;
        }

        public byte[] GetReleaseBlob(int releaseId)
        {
            string query = "SELECT size,firmware_data " +
                           "FROM firmware_release " +
                           "WHERE id=@id ";
            DynamicParameters prms = new DynamicParameters();
            prms.Add("@id", releaseId);

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                using (IDataReader reader = dbConnection.ExecuteReader(query, prms))
                {
                    if (reader.Read())
                    {
                        int size = reader.GetInt32(0);
                        byte[] data = new byte[size];
                        if (reader.GetBytes(1, 0, data, 0, size) == size)
                        {
                            return data;
                        }
                    }
                    return null;
                }
            }
        }

        public bool CreatePatch(FirmwarePatchDescriptor fpd, byte[] blob)
        {
            DynamicParameters prms = new DynamicParameters();
            string query = "INSERT INTO firmware_patch(from_id,to_id,encoding,release_date,size,patch_md5,patch_data,firmware_md5) " +
                           "VALUES(@from_id,@to_id,@encoding,@release_date,@size,@patch_md5,@patch_data,@firmware_md5) ";
            prms.Add("@from_id", fpd.FromFirmwareReleaseId);
            prms.Add("@to_id", fpd.ToFirmwareReleaseId);
            prms.Add("@encoding", fpd.Encoding);
            prms.Add("@release_date", fpd.ReleaseDate);
            prms.Add("@size", fpd.Size);
            prms.Add("@patch_md5", fpd.PatchMD5);
            prms.Add("@patch_data", blob);
            prms.Add("@firmware_md5", fpd.FirmwareMD5);

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                return dbConnection.Execute(query, prms) == 1;
            }
        }

        public FirmwarePatchDescriptor GetPatch(int fromReleaseId, int toReleaseId, string encoding)
        {
            string query = "SELECT release_date,size,patch_md5,firmware_md5 " +
                           "FROM firmware_patch " +
                           "WHERE from_id=@from_id AND to_id=@to_id AND encoding=@encoding ";
            DynamicParameters prms = new DynamicParameters();
            prms.Add("@from_id", fromReleaseId);
            prms.Add("@to_id", toReleaseId);
            prms.Add("@encoding", encoding);

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                using (IDataReader reader = dbConnection.ExecuteReader(query, prms))
                {
                    if (reader.Read())
                    {
                        FirmwarePatchDescriptor frd = new FirmwarePatchDescriptor()
                        {
                            FromFirmwareReleaseId = fromReleaseId,
                            ToFirmwareReleaseId = toReleaseId,
                            ReleaseDate = new DateTime(reader.GetDateTime(0).Ticks, DateTimeKind.Utc),
                            Size = reader.GetInt32(1),
                            Encoding = encoding,
                            PatchMD5 = reader.GetString(2),
                            FirmwareMD5 = reader.GetString(3)
                        };
                        return frd;
                    }
                    else
                    {
                        return null;
                    }
                }
            }
        }

        public byte[] GetPatchBlob(int fromReleaseId, int toReleaseId, string encoding)
        {
            string query = "SELECT size,patch_data " +
                           "FROM firmware_patch " +
                           "WHERE from_id=@from_id AND to_id=@to_id AND encoding=@encoding ";
            DynamicParameters prms = new DynamicParameters();
            prms.Add("@from_id", fromReleaseId);
            prms.Add("@to_id", toReleaseId);
            prms.Add("@encoding", encoding);

            using (IDbConnection dbConnection = _dbProvider.GetConnection())
            {
                dbConnection.Open();
                using (IDataReader reader = dbConnection.ExecuteReader(query, prms))
                {
                    if (reader.Read())
                    {
                        int size = reader.GetInt32(0);
                        byte[] data = new byte[size];
                        if (reader.GetBytes(1, 0, data, 0, size) == size)
                        {
                            return data;
                        }
                    }
                    return null;
                }
            }
        }
    }
}