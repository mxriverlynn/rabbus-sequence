var storage = require("../storage");

// Producer
// --------

function Producer(options){
  this.options = options;
  this.middleware = this.middleware.bind(this);
}

// API
// ---

Producer.prototype.middleware = function(message, headers, actions){
  var keyName = this.options.key;
  var value = message[keyName];
  var sequence = storage.getIncrementedSequence(keyName, value);

  headers["_rabbus_sequence"] = sequence;

  actions.next();
};

// Exports
// -------

module.exports = Producer;
