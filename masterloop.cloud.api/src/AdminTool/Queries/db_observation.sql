DROP TABLE IF EXISTS observation;

CREATE TABLE observation (
 time       TIMESTAMP   NOT NULL,
 mid        VARCHAR(16) NOT NULL,
 oid        INT         NOT NULL,
 created_on TIMESTAMP   NOT NULL,

 v_bool    BOOLEAN          NULL,
 v_dbl     DOUBLE PRECISION NULL,
 v_int     INTEGER          NULL,
 v_pos_lat REAL             NULL,
 v_pos_lon REAL             NULL,
 v_pos_alt REAL             NULL,
 v_pos_dop REAL             NULL,
 v_str     TEXT             NULL,
 v_stat_cnt INTEGER             NULL,
 v_stat_mean REAL     NULL,
 v_stat_min REAL NULL,
 v_stat_max REAL NULL,
 v_stat_from TIMESTAMP NULL,
 v_stat_to TIMESTAMP NULL,
 v_stat_stddev REAL NULL,
 v_stat_median REAL NULL,
 UNIQUE(time, mid, oid)
);

CREATE UNIQUE INDEX ON observation (time, mid, oid);

SELECT create_hypertable('observation', 'time', chunk_time_interval => INTERVAL '1 day');

ALTER TABLE observation SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'mid,oid'
);

SELECT add_compression_policy('observation', INTERVAL '30 days');
