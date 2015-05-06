var storage = {};

var API = {

  getSequence: function(key, value, cb){
    var sequence;
    var storageKey = getStorageKey(key, value);

    if (storage[storageKey]){
      sequence = storage[storageKey];
    } else {
      sequence = {
        key: key,
        value: value,
        lastSent: 0,
        lastProcessed: 0
      };
      storage[storageKey] = sequence;
    }

    cb(null, sequence);
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

module.exports = API;
