var Sequence = require("../sequence");
var Rabbus = require("rabbus");
var wascally = require("wascally");

describe("sequence id", function(){
  var msgType1 = "pub-sub.messageType.1";

  var exConfig = {
    name: "sequence.ex.1",
    autoDelete: true
  };

  var qConfig = {
    name: "sequence.q.1",
    autoDelete: true
  };

  describe("when a producer has a new key/value", function(){
    var pub, sub;
    var results = [];

    beforeEach(function(done){
      pub = new Rabbus.Publisher(wascally, {
        exchange: exConfig,
        messageType: msgType1
      });

      var sequencer = new Sequence.Producer({ key: "id" });
      pub.use(sequencer.middleware);

      sub = new Rabbus.Subscriber(wascally, {
        exchange: exConfig,
        queue: qConfig,
        messageType: msgType1,
        routingKeys: msgType1,
      });

      sub.use(function(msg, properties, actions, next){
        results.push(properties.headers["_rabbus_sequence"]);
        next();
      });

      sub.subscribe(function(data){
        done();
      });

      function pubIt(){
        pub.publish({
          id: "qwer-1234a-asdf",
          foo: "bar"
        });
      }

      sub.on("ready", pubIt);
    });

    it("should create a new sequence id", function(){
      var sequence = results[0];
      expect(sequence._id).not.toBe(undefined);
      expect(sequence.key).toBe("id");
      expect(sequence.value).toBe("qwer-1234a-asdf");
      expect(sequence.number).toBe(1);
    });

    afterEach(function(){
      sub.stop();
      Sequence.DefaultStorage.clear("id", "qwer-1234a-asdf");
    });
  });

  describe("when a consumer has an id for a key/value, but receives a new id for that key/value, and a message sequence of 1", function(){
    var pub, sub, newId;
    var results = [];

    beforeEach(function(done){
      pub = new Rabbus.Publisher(wascally, {
        exchange: exConfig,
        messageType: msgType1
      });

      var pubSeq = new Sequence.Producer({ key: "id" });
      pub.use(pubSeq.middleware);

      sub = new Rabbus.Subscriber(wascally, {
        exchange: exConfig,
        queue: qConfig,
        messageType: msgType1,
        routingKeys: msgType1,
      });

      //hijack the sequence header and update it with a new id
      var subCount = 0;
      sub.use(function(message, properties, actions, next){
        subCount += 1;
        if (subCount != 3) { 
          return next(); 
        }

        newId = "modified.qwer.1234-asdf." + Date.now().toString();

        var headers = properties.headers;
        var seq = headers["_rabbus_sequence"];
        seq._id = newId;
        seq.number = 1;

        next();
      });

      var subSeq = new Sequence.Consumer({ key: "id" });
      sub.use(subSeq.middleware);

      sub.subscribe(function(data){
        if (subCount === 3){
          done();
        }
      });

      function pubIt(){
        pub.publish({
          id: "qwer-1234a-asdf",
          foo: "msg 1"
        });
        pub.publish({
          id: "qwer-1234a-asdf",
          foo: "msg 2"
        });
        setTimeout(function(){
          pub.publish({
            id: "qwer-1234a-asdf",
            foo: "msg 3"
          });
        }, 25);
      }

      sub.on("ready", pubIt);
    });

    it("should restart the sequence from the new id", function(done){
      Sequence.DefaultStorage.getSequence("id", "qwer-1234a-asdf", function(err, sequence){
        expect(sequence._id).toBe(newId);
        expect(sequence.lastProcessed).toBe(1);
        done();
      });
    });

    afterEach(function(){
      sub.stop();
      Sequence.DefaultStorage.clear("id", "qwer-1234a-asdf");
    });
  });

});
