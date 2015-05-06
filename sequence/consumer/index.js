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

    var isInOrder = (msgSeq.number === (sequence.lastProcessed + 1));
    if (!isInOrder){
      return actions.nack();
    }

    storage.incrementProcessed(sequence, function(err, sequence){
      if (err) { return actions.error(err); }
      actions.next();
    });
  });
};

// Exports
// -------

module.exports = Consumer;
