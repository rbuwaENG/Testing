DROP TABLE IF EXISTS firmware_patch;

CREATE TABLE firmware_patch (
 from_id      INTEGER     NOT NULL,
 to_id        INTEGER     NOT NULL,
 encoding     VARCHAR(64) NOT NULL,
 release_date TIMESTAMP   NOT NULL,
 size         INTEGER     NOT NULL,
 patch_md5    VARCHAR(64) NOT NULL,
 patch_data   BYTEA       NOT NULL,
 firmware_md5 VARCHAR(64) NOT NULL,
 PRIMARY KEY (from_id, to_id, encoding)
);