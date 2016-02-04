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

Consumer.prototype.middleware = function(message, properties, actions, next){
  var that = this;
  var msgSeq = properties.headers["_rabbus_sequence"];

  // do nothing if there is no sequence header
  if (!msgSeq){
    return next();
  }

  // found the sequence header, so handle it.
  storage.checkMessageOrder(msgSeq, function(err, order){
    if (err) { return next(err); }

    switch (order){
      case MessageOrder.past:
        actions.reject();
        break;

      case MessageOrder.current:
        that.handleSequence(msgSeq, next);
        break;
        
      default:
        that.handleSequence(msgSeq, next);
        break;
    }

  });
};

Consumer.prototype.handleSequence = function(msgSeq, next){
  storage.incrementProcessed(msgSeq, function(err){
    if (err) { return next(err); }
    next();
  });
};

// Exports
// -------

module.exports = Consumer;
