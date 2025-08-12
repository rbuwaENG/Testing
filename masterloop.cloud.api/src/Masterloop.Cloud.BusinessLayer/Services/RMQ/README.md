# Masterloop Cloud Services - RabbitMQ Configuration

## General
Masterloop Cloud Services implements RabbitMQ as message broker.
Other brokers can be supported by implementing the IRMQAdminClient and IRMQPublishService interfaces.

## RabbitMQ deployment
A suitable RabbitMQ environment must be established prior to running MCS.
The size of the RMQ environment depends on the number of devices, traffic, users and other parameters.
Both single node, multi node for example with shoveling, and clusters are supported.

### Enabled Plugins
The following plugins must be enabled:
- rabbitmq_consistent_hash_exchange
- rabbitmq_management
- rabbitmq_mqtt
- rabbitmq_shovel
- rabbitmq_shovel_management
- rabbitmq_web_stomp

### User Accounts
While any user account schema could exist, it is recommended to create these users:

|Username     |Tags         |Description      |
|-------------|-------------|-----------------|
|mcs_api      |administrator|REST API account |
|mcs_chopper  |none         |Chopper account  |
|mcs_janitor  |monitoring   |Janitor account  |
|mcs_historian|none         |Historian account|
|guest        |none         |Guest account    |

### REST API account permissions
- Configure: .*
- Write: .*
- Read: .*

### Chopper account permissions
- Configure: ^$
- Write: .*
- Read: .*

### Janitor account permissions
- Configure: .*
- Write: .*
- Read: .*

### Historian account permissions
- Configure: ^$
- Write: .*
- Read: .*

### Guest account permissions
None - disable this account.

## Exchanges
All exchanges described below must be created before starting the MCS system.

### Chopper Exchange
Name: ChopperCHE.X
Type: x-consistent-hash
Features: durable=true

### Observation Historian Exchange
Name: ObservationHistorianCHE.SX
Type: x-consistent-hash
Features: durable=true

### Command Historian Exchange
Name: CommandHistorianCHE.SX
Type: x-consistent-hash
Features: durable=true

### Pulse Historian Exchange
Name: PulseHistorianCHE.SX
Type: x-consistent-hash
Features: durable=true

## Queues
All queues described below must be created before starting the MCS system.

### Chopper Queues
Name: Chopper<n>.SQ
Type: classic
Features: durable=true
Node: Designated node for chopper queue. This is usually a device node, which the devices belong to to avoid cross-node communication.

Comment: It is recommended to have 1 queue and ChopperWorker per 100 COS messages per second.
Chopper queues contain OP messages that will be chopped up into atomic observations and re-published on the relevant device exchange for further distribution.

### Observation Historian Queues
Name: ObservationHistorian<n>.SQ
Type: classic
Features: durable=true
Node: Designated node for observation historian queues.

Comment: It is recommended to have 1 queue and HistorianWorker per 2000 messages per second.
Observation historian queues contain messages that should be stored in the observation historian databases, by default based on Redis cache and PostgreSql with TimescaleDB.

### Command Historian Queue
Name: CommandHistorian<n>.SQ
Type: classic
Features: durable=true
Node: Designated node for command historian queue.

Comment: It is recommended to have 1 queue per 1000 command messages per second.
If number of commands per second exceeds this limit, it is recommended to have multiple queues to scale out the command history storage process.

### Pulse Historian Queue
Name: PulseHistorian<n>.SQ
Type: classic
Features: durable=true
Node: Designated node for pulse historian queue.

Comment: It is recommended to have 1 queue per 1000 pulse messages per second.
If number of pulse per second exceeds this limit, it is recommended to have multiple queues to scale out the command history storage process.

## Bindings

### Observations

From: amq.topic
To: ObservationHistorianCHE.SX
Routing: *.O.*

From: ObservationHistorianCHE.SX
To: Historian<n>.SQ
Routing key: 3 (weight)

### Commands

From: amq.topic
To: CommandHistorianCHE.SX
Routing: *.C.*

From: amq.topic
To: CommandHistorianCHE.SX
Routing: *.CR.*

From: CommandHistorianCHE.SX
To: CommandHistorian<n>.SQ
Routing: 3 (weight)


### Pulses

From: amq.topic
To: PulseHistorianCHE.SX
Routing: *.P

From: amq.topic
To: PulseHistorianCHE.SX
Routing: *.P.*

From: PulseHistorianCHE.SX
To: PulseHistorian<n>.SQ
Routing: 3 (weight)

### System messages

From: amq.topic
To: <queue names>.SQ  (must be direct to queue, NOT through consistent hash exchanges - as they will then only end up in one queue).
Routing key: SYS.#

Note: Create one binding for each of the queues (*.SQ) mentioned above. This allows all processes to receive system pulses.
