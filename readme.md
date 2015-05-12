# Rabbus-Sequence

Middleware for [Rabbus](/derickbailey/rabbus) and RabbitMQ to
reject old messages.

## About Rabbus-Sequence

The gist of how this works:

When a message is published through Rabbus with this middleware,
a sequence header is attached. The sequence is automatically
incremented for each message that is sent. 

On the consumer side of things, the middleware reads the 
sequence of each message that comes in. If the sequence number
of the message is the one that is expected, or one in the future (
a higher sequence number) it allows the
message to continue through the other middleware / processing.
If the sequence number is old, it rejects the message, dropping it
from RabbitMQ entirely.

Due to the nature of this plug rejecting out of sequence / old messages,
you should have a dead letter exchange configured for your queue.

## Using Rabbus-Sequence

To use Rabbus-Sequence, you need [Rabbus](/derickbailey/rabbus)
in your system already. Then you need to create an instance of
a `Sequence.Producer` and `Sequence.Consumer` for each end of
the pipeline.

For a message producer:

```js
var Sequence = require("rabbus-sequence");

var pub = new MyPublisher();

var pubSequence = new Sequence.Producer({
  key: "id"
});

pub.use(pubSequence.middleware);
```

For a message consumer:

```js
var Sequence = require("rabbus-sequence");

var sub = new MySubscriber();

var subSequence = new Sequence.Consumer({
  key: "id"
});

sub.use(subSequence.middleware);
```

### Sequence key

Note the use of a `key` in the options for the Sequence
objects. This tells the sequence which to track a sequence
for each unique value found in this field on the messages.

For example, if you have two messages that are sent with
the same `id` field, and the `key` set to `id`, these messages
will use the same sequence.

```js
{
  id: "1234"
  foo: "bar"
}

{
  id: "1234",
  foo: "baz quux"
}
```

This will produce a sequence 1 and 2 for the two messages.

When a new `id` value is encountered, a new sequence is
produced, starting at a value of 1.

## Legalese

Rabbus and Rabbus-Sequence are Copyright &copy;2015 Muted Solutions, LLC. All Rights Reserved. 

Distributed under the [MIT license](http://mutedsolutions.mit-license.org).

