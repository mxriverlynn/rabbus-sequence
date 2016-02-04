var storage = require("../storage");

// Producer
// --------

function Producer(options){
  this.options = options;
  this.middleware = this.middleware.bind(this);
}

// API
// ---

Producer.prototype.middleware = function(message, headers, next){
  var keyName = this.options.key;

  // don't do anything if there is no key
  if (!(keyName in message)){
    return next();
  }

  // found the key, so process it
  var value = message[keyName];
  storage.getSequence(keyName, value, function(err, sequence){
    if (err) { return next(err); }

    storage.incrementSent(sequence, function(err, sequence){
      if (err) { return next(err); }

      var number = sequence.lastSent;
      var key = (sequence.key || "").toString();
      var value = (sequence.value || "").toString();

      var headerSequence = {
        _id: sequence._id,
        key: key,
        value: value,
        number: number
      };
      headers["_rabbus_sequence"] = headerSequence;

      next();
    });
  });
};

// Exports
// -------

module.exports = Producer;
