# ChopperWorker

## ChopperWorker main loop

´´´

Run:
  If subscriber or publisher not connected:
    Dispose subscriber and publisher objects.
    Connect subscriber to broker.
    Connect publisher to broker.
  Wait 1 second, repeat.

Callback when message is received:
  Decode routing key.
  If COS message:
    Deserialize COS payload.
    Add observations to message buffer.
    If message buffer > batch size:
      Publish message buffer.
      Ack last message.


´´´