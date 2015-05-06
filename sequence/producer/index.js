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
  storage.getSequence(keyName, value, function(err, sequence){
    if (err) { return actions.error(err); }

    storage.incrementSent(sequence, function(err, sequence){
      if (err) { return actions.error(err); }

      var number = sequence.lastSent;
      var headerSequence = JSON.parse(JSON.stringify(sequence));
      headerSequence.number = number;
      headers["_rabbus_sequence"] = headerSequence;

      actions.next();
    });
  });
};

// Exports
// -------

module.exports = Producer;
