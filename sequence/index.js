var Producer = require("./producer");
var Consumer = require("./consumer");
var DefaultStorage = require("./storage");

var Sequence = {
  Producer: Producer,
  Consumer: Consumer,
  DefaultStorage: DefaultStorage
};

module.exports = Sequence;
