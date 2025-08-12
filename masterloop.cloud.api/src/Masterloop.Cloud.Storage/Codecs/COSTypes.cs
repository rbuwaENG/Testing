namespace Masterloop.Cloud.Storage.Codecs
{
    public enum COSHeaderFlag : byte
    {
        COS_HEADER_MULTI_OBSERVATIONS = 0x20,
        COS_HEADER_MULTI_TIMESTAMPS = 0x40,
        COS_HEADER_64BIT_TIMESTAMPS = 0x80
    }

    public enum COSObservationType : byte
    {
        COS_OBS_TYPE_UNDEFINED = 0,
        COS_OBS_TYPE_BOOLEAN = 1,
        COS_OBS_TYPE_DOUBLE = 2,
        COS_OBS_TYPE_FLOAT = 3,
        COS_OBS_TYPE_INT32 = 4,
        COS_OBS_TYPE_INT16 = 5,
        COS_OBS_TYPE_UINT16 = 6,
        COS_OBS_TYPE_INT8 = 7,
        COS_OBS_TYPE_UINT8 = 8,
        COS_OBS_TYPE_POSITION_2D = 9,
        COS_OBS_TYPE_POSITION_3D = 10,
        COS_OBS_TYPE_ASCII = 11,
        COS_OBS_TYPE_UTF8 = 12,
        COS_OBS_TYPE_STATISTICS = 13,
        COS_OBS_TYPE_BINARY = 14
    }

    public enum COSStatisticsFlag : byte
    {
        COS_STATISTICS_HAS_TIMERANGE = 0x20,
        COS_STATISTICS_HAS_STDDEV = 0x40,
        COS_STATISTICS_HAS_MEDIAN = 0x80
    }
}