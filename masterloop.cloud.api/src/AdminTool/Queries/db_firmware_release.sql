DROP TABLE IF EXISTS firmware_release;

CREATE TABLE firmware_release (
 id           SERIAL      NOT NULL,
 template_id  VARCHAR(16) NOT NULL,
 is_current   BOOLEAN     NOT NULL,
 release_date TIMESTAMP   NOT NULL,
 version_no   VARCHAR(64) NOT NULL,
 size         INTEGER     NOT NULL,
 firmware_md5 VARCHAR(64) NOT NULL,
 firmware_data BYTEA      NOT NULL,
 PRIMARY KEY (id),
 UNIQUE (template_id, version_no)
);