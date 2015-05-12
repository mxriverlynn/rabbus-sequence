var storage = require("../storage");
var MessageOrder = require("../messageOrder");

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
  storage.checkMessageOrder(msgSeq, function(err, order){
    if (err) { return actions.error(err); }

    switch (order){
      case MessageOrder.past:
        actions.reject();
        break;
        
      default:
        storage.incrementProcessed(msgSeq, function(err, sequence){
          if (err) { return actions.error(err); }
          actions.next();
        });
        break;
    }
  });
};

// Exports
// -------

module.exports = Consumer;
