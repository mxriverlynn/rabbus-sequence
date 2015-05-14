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
  var that = this;
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

      case MessageOrder.current:
        that.handleSequence(msgSeq, actions);
        break;
        
      default:
        that.handleSequence(msgSeq, actions);
        break;
    }

  });
};

Consumer.prototype.handleSequence = function(msgSeq, actions){
  storage.incrementProcessed(msgSeq, function(err){
    if (err) { return actions.error(err); }
    actions.next();
  });
};

// Exports
// -------

module.exports = Consumer;
