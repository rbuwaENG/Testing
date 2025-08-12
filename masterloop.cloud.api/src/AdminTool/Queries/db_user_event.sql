DROP TABLE IF EXISTS user_event;

CREATE TABLE user_event (
 time        TIMESTAMP   NOT NULL,
 uid         VARCHAR(64) NOT NULL,
 category    INTEGER     NOT NULL,
 created_on  TIMESTAMP   NOT NULL,
 title       VARCHAR(64) NULL,
 body        VARCHAR(1024) NULL,
 UNIQUE(time,uid,category)
);

CREATE UNIQUE INDEX ON user_event (time, uid, category);

SELECT create_hypertable('user_event', 'time', chunk_time_interval => INTERVAL '1 day');

ALTER TABLE user_event SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'uid,category'
);

SELECT add_compression_policy('user_event', INTERVAL '30 days');
