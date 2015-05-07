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

      sub.use(function(msg, properties, actions){
        results.push(properties.headers["_rabbus_sequence"]);
        actions.next();
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
    var pub, sub;
    var results = [];

    beforeEach(function(done){
      pub = new Rabbus.Publisher(wascally, {
        exchange: exConfig,
        messageType: msgType1
      });

      var pubSeq = new Sequence.Producer({ key: "id" });
      pub.use(pubSeq.middleware);

      //hijack the sequence header and update it with a new id
      var pubCount = 0;
      pub.use(function(message, headers, actions){
        pubCount += 1;
        if (pubCount != 3) { 
          return actions.next(); 
        }

        var seq = headers["_rabbus_sequence"];
        seq._id = "modified.qwer.1234-asdf." + Date.now().toString();
        seq.number = 1;

        actions.next();
      });

      sub = new Rabbus.Subscriber(wascally, {
        exchange: exConfig,
        queue: qConfig,
        messageType: msgType1,
        routingKeys: msgType1,
      });

      var subSeq = new Sequence.Consumer({ key: "id" });
      sub.use(subSeq.middleware);

      var subCount = 0;
      sub.use(function(msg, properties, actions){
        if (subCount === 2){
          results.push(properties.headers["_rabbus_sequence"]);
          results.push(msg);
        }
        actions.next();
      });

      sub.subscribe(function(data){
        subCount += 1;
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
        pub.publish({
          id: "qwer-1234a-asdf",
          foo: "msg 3"
        });
      }

      sub.on("ready", pubIt);
    }, 50000);

    it("should restart the sequence from the new id", function(){
      var sequence = results[0];
      var msg = results[1];
      expect(sequence._id).not.toBe(undefined);
      expect(sequence.key).toBe("id");
      expect(sequence.value).toBe("qwer-1234a-asdf");
      expect(sequence.number).toBe(1);

      expect(msg.foo).toBe("msg 3");
    });

    afterEach(function(){
      sub.stop();
      Sequence.DefaultStorage.clear("id", "qwer-1234a-asdf");
    });
  });

});
