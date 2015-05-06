var storage = {

  getIncrementedSequence: function(key, value){
    var sequence = this.getCurrentSequence(key, value);
    sequence.current += 1;
    return sequence;
  },

  getCurrentSequence: function(key, value){
    var sequence;
    var storageKey = key + "." + value;

    if (storage[storageKey]){
      sequence = storage[storageKey];
    } else {
      sequence = {
        key: key,
        value: value,
        current: 0
      };
      storage[storageKey] = sequence;
    }

    return sequence;
  }

};

module.exports = storage;
