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

  var msgSeq = properties.header["_rabbus_sequence"];
  var sequence = storage.getCurrentSequence(keyName, value);

  var isInOrder = (msgSeq.current === (sequence.current + 1));
  if (isInOrder){
    actions.next();
  } else {
    actions.nack();
  }
};

// Exports
// -------

module.exports = Consumer;
