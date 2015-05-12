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

  // don't do anything if there is no key
  if (!(keyName in message)){
    return actions.next();
  }

  // found the key, so process it
  var value = message[keyName];
  storage.getSequence(keyName, value, function(err, sequence){
    if (err) { return actions.error(err); }

    storage.incrementSent(sequence, function(err, sequence){
      if (err) { return actions.error(err); }

      var number = sequence.lastSent;
      var headerSequence = {
        _id: sequence._id,
        key: sequence.key,
        value: sequence.value,
        number: number
      };
      headers["_rabbus_sequence"] = headerSequence;

      actions.next();
    });
  });
};

// Exports
// -------

module.exports = Producer;
