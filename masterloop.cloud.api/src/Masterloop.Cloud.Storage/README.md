# Masterloop Cloud Storage

## Databases

Masterloop Cloud Storage currently persists data using two different database technologies, used in pair.

* Redis: Used for storing current, compact data records that are requested frequently.
* PostgreSQL with TimescaleDB: Used for storing historical records and larger blobs.

Databases must be initialized with the AdminTool, using the "--initredis" and "--initpostgresql" operations.


## Redis Database Reference

### Indexes (db0)

Contains the following indexes:

AllDevices: List of all devices registered with the system.
AllTenants: List of all tenants registered with the system.
AllUsers: List of all users registered with the system.

### Template details (db1)

Contains device template description.

Key: <TemplateId>
Value: Json representation of DeviceTemplate object for <TtemplateId>.

### Current observation values (db2)

Contains current/latest observations for each device.

Key: <MID>
Value: Hash table with: Key=<ObservationId>, Value=<timestamp>,<value-as-string>

### Device details (db3)

Contains SecureDeviceDetails values for each device.

Key: <MID>
Value: Json representation of SecureDeviceDetails object for <MID>.

### Tenant details (db4)

Contains information about tenants.

Key: <TenantId>
Value: Json representation of SecureTenant object for <TenantId>.

### User details (db5)

Contains information about user accounts.

Key: <UserId> (e-mail account)
Value: Json representation of SecureUser object for <UserId>.

### Settings for devices (db6)

Contains settings for devices.

Key: <MID>
Value: Json representation of SettingsPackage object for <MID>.

### Current pulse period (db7)

Contains current pulse period for devices.

Key: <MID>
Value: Json representation of DetailedPulsePeriod object for <MID>.

### Template->Devices maps (db8)

Contains relationship map from template to its devices.

Key: <TemplateId>
Value: Set of <MID> devices that belong to <TemplateId>.

### Tenant->Users map (db9)

Contains relationships map from tenant to its users.

Key: <TenantId>
Value: Hash table with: Key=<UserId>, Value=Json representation of <TenantPermission> object for <UserId> on <TenantId>.

### Tenant->Templates map (db10)

Contains relationships map from tenant to its templates.

Key: <TenantId>
Value: Set of <TemplateId> templates that belong to <TenantId>.

### Node configurations (db11)

Contains node configurations for all accounts.

Key: <AccountId>
Value: Json representation of NodeConfiguration (or subclasses). Devices use DeviceNodeConfiguration.


## PostgreSQL with TimescaleDB Database Reference

### General

This database contains historian data and blob data that is too big to fit into the Redis database.

The TimescaleDB configuration is based on volume. Especially, "chunk_time_interval" must be configured based on expected volume.
When storing 10M messages per hour, 1 hour can be an acceptable value. However, with smaller volumes, the interval should be longer.
With larger volumes, the interval could be smaller. Please benchmark to find the correct value for your deployment.

### Observation History

PostgreSQL table definition

```
CREATE TABLE observation (
 time       TIMESTAMP   NOT NULL,
 mid        VARCHAR(16) NOT NULL,
 oid        SMALLINT    NOT NULL,
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

SELECT create_hypertable('observation', 'time', chunk_time_interval => INTERVAL '1 hour');
```

### Command History

PostgreSQL table definition
```
CREATE TABLE command (
 time       TIMESTAMP   NOT NULL,
 mid        VARCHAR(16) NOT NULL,
 cid        SMALLINT    NOT NULL,
 created_on TIMESTAMP   NOT NULL,

 expires_at   TIMESTAMP          NULL,
 arguments   TEXT   NULL,
 delivered_at TIMESTAMP  NULL,
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

SELECT create_hypertable('command', 'time', chunk_time_interval => INTERVAL '1 hour');
```

### Pulse History

PostgreSQL table definition
```
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

SELECT create_hypertable('pulse', 'time', chunk_time_interval => INTERVAL '1 hour');
```

### System Event History

PostgreSQL table definition
```
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
```

### Device Event History

PostgreSQL table definition
```
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
```

### User Event History

PostgreSQL table definition
```
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
```

### Firmware Release

PostgreSQL table definitions
```
CREATE TABLE firmware_release (
 id           SERIAL      NOT NULL,
 template_id  VARCHAR(16) NOT NULL,
 is_current   BOOLEAN     NOT NULL,
 release_date TIMESTAMP   NOT NULL,
 version_no   VARCHAR(64) NOT NULL,
 size         INTEGER     NOT NULL,
 firmware_md5 VARCHAR(64) NOT NULL,
 firmware_data BYTEA      NOT NULL,
 PRIMARY KEY (id)
);
```

### Firmware Patch

PostgreSQL table definitions
```
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
```
