DROP TABLE IF EXISTS command;

CREATE TABLE command (
 time       TIMESTAMP   NOT NULL,
 mid        VARCHAR(16) NOT NULL,
 cid        SMALLINT    NOT NULL,
 created_on TIMESTAMP   NOT NULL,

 expires_at   TIMESTAMP          NULL,
 arguments   TEXT   NULL,
 delivered_at TIMESTAMP  NULL,
 response_received_at TIMESTAMP NULL,
 was_accepted BOOLEAN NULL,
 origin_app TEXT NULL,
 origin_acnt TEXT NULL,
 origin_addr TEXT NULL,
 origin_ref TEXT NULL,
 result_code INTEGER NULL,
 comment TEXT NULL,
 UNIQUE(time, mid, cid)
);

CREATE UNIQUE INDEX ON command (time, mid, cid);

SELECT create_hypertable('command', 'time', chunk_time_interval => INTERVAL '1 day');
