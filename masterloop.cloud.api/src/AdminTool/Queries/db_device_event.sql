DROP TABLE IF EXISTS device_event;

CREATE TABLE device_event (
 time        TIMESTAMP   NOT NULL,
 mid         VARCHAR(16) NOT NULL,
 category    INTEGER     NOT NULL,
 created_on  TIMESTAMP   NOT NULL,
 title       VARCHAR(64) NULL,
 body        VARCHAR(1024) NULL,
 from_device BOOLEAN NOT NULL,
 UNIQUE(time,mid,category)
);

CREATE UNIQUE INDEX ON device_event (time, mid, category);

SELECT create_hypertable('device_event', 'time', chunk_time_interval => INTERVAL '1 day');

ALTER TABLE device_event SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'mid,category'
);

SELECT add_compression_policy('device_event', INTERVAL '30 days');
