DROP TABLE IF EXISTS pulse;

CREATE TABLE pulse (
 time        TIMESTAMP   NOT NULL,
 mid         VARCHAR(16) NOT NULL,
 pid         SMALLINT    NOT NULL,
 to_time     TIMESTAMP   NOT NULL,
 created_on  TIMESTAMP   NOT NULL,
 count       INTEGER     NOT NULL,
 UNIQUE(time, mid, pid)
);

CREATE UNIQUE INDEX ON pulse (time, mid, pid);

SELECT create_hypertable('pulse', 'time', chunk_time_interval => INTERVAL '30 days');
