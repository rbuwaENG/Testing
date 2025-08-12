DROP TABLE IF EXISTS system_event;

CREATE TABLE system_event (
 time        TIMESTAMP   NOT NULL,
 category    INTEGER     NOT NULL,
 created_on  TIMESTAMP   NOT NULL,
 title       VARCHAR(64) NULL,
 body        VARCHAR(1024) NULL,
 UNIQUE(time,category)
);

CREATE UNIQUE INDEX ON system_event (time, category);

SELECT create_hypertable('system_event', 'time', chunk_time_interval => INTERVAL '1 day');

ALTER TABLE system_event SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'category'
);

SELECT add_compression_policy('system_event', INTERVAL '30 days');
