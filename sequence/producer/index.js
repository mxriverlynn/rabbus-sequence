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
      var key = (sequence.key || "").toString();
      var value = (sequence.value || "").toString();

      var headerSequence = {
        _id: sequence._id,
        key: key,
        value: value,
        number: number
      };
      headers["_rabbus_sequence"] = headerSequence;

      setTimeout(function(){
        actions.next();
      }, Math.round(Math.random(Date.now())*1000));
    });
  });
};

// Exports
// -------

module.exports = Producer;
