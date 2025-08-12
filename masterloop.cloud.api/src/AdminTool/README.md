# Masterloop Cloud Services Admin Tool

## Introduction

This document describes how to use the Masterloop Cloud Services Admin Tool.

As an administrator of an Masterloop based system, the Admin Tool provides functionality to:
- Set up a Masterloop system from scratch.
- Migrate configuration data between Masterloop systems.
- Perform maintenance operations on an existing Masterloop system.


## Setting up a a new Masterloop system from scratch

### Pre-requisites

Before embarking on setting up a new Masterloop system, the following third-party services must be present:
- RabbitMQ
- Redis
- PostgreSQL with TimescaleDB

#### RabbitMQ

RabbitMQ must be enabled with the following plugins:
- rabbitmq_consistent_hash_exchange
- rabbitmq_management
- rabbitmq_mqtt
- rabbitmq_shovel
- rabbitmq_shovel_management
- rabbitmq_web_stomp

It is assumed that the various protocol are by default configured on these ports:
- amqp on port 5672
- amqp/ssl on port 5671
- RabbitMQ Management on port 15671
- mqtt on port 1883
- mqtt/ssl on port 8883
- http/web-stomp on port 443

Recommended configuration tuning:
- Add relevant TLS certificate to the encrypted protocols.
- Limit MQTT send/receive buffer to 4k.
- Configure MQTT plugin to use exchange "mqtt.topic".

#### Redis

It is as default assumed that Redis is configured to listen to port 6379.

#### PostgreSQL with TimescaleDB

It is as default assumed that PostgreSQL is configured to listen to port 5432.
TimescaleDB must be installed and enabled for the PostgreSQL service.


### Configuring AdminTool

The Masterloop AdminTool must be configured with the correct connection information before it can be started.

Edit the file "appsettings.json" within the AdminTool folder and specify the following parameters:
- General.NLogConfigFile: Set to location of NLog config file, by default "NLog.config".
- Masterloop.Hostname/Username/Password: Set to user to be used as the initial Masterloop administrator user.
- RabbitMQ.ConnectionString: Set to "<host>,<username>,<password>"
- Redis.ConnectionString: Set to "<host>:<port>,ssl=false,password=<password>"
- PostgreSQL.ConnectionString: Set to "Host=<host>; Port=<port>; Database=masterloop; User ID=<user>; Password=<password>;"


### Initializing a new Masterloop environment

#### Configuring RabbitMQ

Follow the instructions described in file "Masterloop.Cloud.BusinessLayer/Services/RMQ/README.md" to establish a RabbitMQ configuration that fits your organizations needs.
Note that the RabbitMQ configuration should be re-evaluated over time, and expanded as number of connections and messages grow.
Build-up of messages in system queues is an indication that an expansion might be needed. It is recommended establishing metric collection from RabbitMQ and monitor the values.

#### Initializing Redis

Run the following command:
``` masterloopctl --initredis ```

Status of Redis initialization will be reported in the console.
The root tenant "Masterloop" will be created for initial login to the system. Login information is outputted to console.

The Redis state can also be inspected using a Redis database browser, such as rdm (https://rdm.dev).

This operation can only be run once. The Redis database must be emptied if the operation needs to be re-run.

#### Initializing PostgreSQL

Create a new database.
Create a user account that has superuser permissions on the newly created database.
Configuration data *must* match "appsettings.json" as specified under chapter "Configuring AdminTool".

Run the following command:
``` masterloopctl --initpostgresql <dbname> ```

Status of PostgreSQL initialization will be reported in the console.
The PostgreSQL state can also be inspected using a PostgreSQL database browser, such as pgAdmin (https://www.pgadmin.org).

This operation can only be run once. The PostgreSQL database must be deleted and re-created if the operation needs to be re-run.


### Migrating configuration from an existing Masterloop 4.x system to 5.x+

#### Importing Tenant Structures (Tenant, User, Template, Firmware)

#### Importing Device Structures (Device, Setting)

#### Importing Historian Data (Observation, Command, Pulse, EventLog)


### Deploying Masterloop WebAPI Docker image as a container

TODO

### Deploying Masterloop HistorianWorker Docker image as a container

TODO

### Deploying Masterloop ChopperWorker Docker image as a container

TODO

### Deploying Masterloop JanitorWorker Docker image as a container

TODO

### Deploying Masterloop MonitorWorker Docker image as a container

TODO
