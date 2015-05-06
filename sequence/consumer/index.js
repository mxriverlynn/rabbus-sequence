var storage = require("../storage");

// Consumer
// --------

function Consumer(options){
  this.options = options;
  this.middleware = this.middleware.bind(this);
}

// API
// ---

Consumer.prototype.middleware = function(message, properties, actions){
  var keyName = this.options.key;
  var value = message[keyName];
  var msgSeq = properties.headers["_rabbus_sequence"];

  // do nothing if there is no sequence header
  if (!msgSeq){
    return actions.next();
  }

  // found the sequence header, so handle it.
  storage.getSequence(keyName, value, function(err, sequence){
    if (err) { return actions.error(err); }

    console.log("msg number:", msgSeq.number);
    console.log("last sent:", sequence.lastSent);
    console.log("last processed:", sequence.lastProcessed);

    var isInOrder = (msgSeq.number === (sequence.lastProcessed + 1));

    if (!isInOrder){
      console.log("----------------- OUT OF ORDER. NOT PROCESSING", msgSeq.number);
      actions.nack();
      return;
    }

    storage.incrementProcessed(sequence, function(err, sequence){
      if (err) { return actions.error(err); }

      console.log("----------------- IN ORDER. PROCESSING", msgSeq.number);
      actions.next();
    });
  });
};

// Exports
// -------

module.exports = Consumer;
