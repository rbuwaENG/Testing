# HistorianWorker

## Design

A HistorianWorker instance is responsible for one of the following ConsumerTypes:

Command
Event
Observation
Pulse

## HistorianWorker main loop

One and only one HistorianWorker should run per historian queue.
Use more threads if necessary.

### Recommended Observation Worker Configuration

BatchSize=10
ThreadCount=8
PrefetchCount=100


### Recommended Command Worker Configuration

BatchSize=1
ThreadCount=8
PrefetchCount=100

### Recommended Pulse Worker Configuration

BatchSize=10
ThreadCount=8
PrefetchCount=100
