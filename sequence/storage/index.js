var MessageOrder = require("../messageOrder");

var storage = {};

var API = {

  getSequence: function(key, value, cb){
    var sequence;
    var storageKey = getStorageKey(key, value);

    if (storage[storageKey]){
      sequence = storage[storageKey];
    } else {
      var sequenceId = generateId(key, value);
      sequence = {
        _id: sequenceId,
        key: key,
        value: value,
        lastSent: 0,
        lastProcessed: 0
      };
      storage[storageKey] = sequence;
    }

    cb(null, sequence);
  },

  getSequenceWithId: function(msgSeq, cb){
    var storage = this;
    storage.getSequence(msgSeq.key, msgSeq.value, function(err, sequence){
      if (err) { return cb(err); }

      var correctSequenceId = (msgSeq._id === sequence._id);
      if (correctSequenceId){
        return cb(undefined, sequence);
      }

      storage.clear(msgSeq.key, msgSeq.value, function(err){
        if (err) { return cb(err); }
        return storage.getSequence(msgSeq.key, msgSeq.value, function(err, sequence){
          sequence._id = msgSeq._id;
          cb(err, sequence);
        });
      });

    });
  },

  checkMessageOrder: function(msgSeq, cb){
    var storage = this;

    storage.getSequenceWithId(msgSeq, function(err, sequence){
      if (err) { return cb(err); }

      var currentNumber = (sequence.lastProcessed + 1);

      var order;
      if (msgSeq.number < currentNumber){
        order = MessageOrder.past;
      } else if (msgSeq.number === currentNumber) {
        order = MessageOrder.current;
      } else {
        order = MessageOrder.future;
      }

      cb(undefined, order);
    });
  },

  incrementSent: function(sequence, cb){
    this.getSequence(sequence.key, sequence.value, function(err, sequenc){
      if (err) { return cb(err); }

      sequence.lastSent += 1;
      cb(null, sequence);
    });
  },

  incrementProcessed: function(sequence, cb){
    this.getSequence(sequence.key, sequence.value, function(err, sequence){
      if (err) { return cb(err); }

      sequence.lastProcessed += 1;
      cb(null, sequence);
    });
  },

  clear: function(key, value, cb){
    var storageKey = getStorageKey(key, value);
    storage[storageKey] = undefined;
    if (cb){ cb(undefined); }
  }

};

function getStorageKey(key, value){
  return key + "." + value;
}

function generateId(key, value){
  var dateString = Date.now().toString();
  return key + "." + value + "." + dateString;
}

module.exports = API;
