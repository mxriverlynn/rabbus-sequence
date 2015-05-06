var Sequence = require("../sequence");
var Rabbus = require("rabbus");
var wascally = require("wascally");

describe("sequencing", function(){
  var msgType1 = "pub-sub.messageType.1";

  var exConfig = {
    name: "sequence.ex.1",
    autoDelete: true
  };

  var qConfig = {
    name: "sequence.q.1",
    autoDelete: true
  };

  describe("when messages are sent", function(){
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

    it("should add sequence info", function(){
      var sequence = results[0];
      expect(sequence.key).toBe("id");
      expect(sequence.value).toBe("qwer-1234a-asdf");
      expect(sequence.number).toBe(1);
    });

    afterEach(function(){
      sub.stop();
      Sequence.DefaultStorage.clear("id", "qwer-1234a-asdf");
    });
  });

  describe("when messages are received out of order", function(){
    var pub, sub;
    var results = [];

    beforeEach(function(done){
      pub = new Rabbus.Publisher(wascally, {
        exchange: exConfig,
        messageType: msgType1
      });

      var prodSeq = new Sequence.Producer({ key: "id" });
      pub.use(prodSeq.middleware);

      // delay the first message
      var pubCount = 0;
      pub.use(function(msg, headers, actions){
        pubCount += 1;
        if (pubCount === 1){
          setTimeout(function(){
            actions.next();
          }, 25);
        } else {
          actions.next();
        }
      });

      sub = new Rabbus.Subscriber(wascally, {
        exchange: exConfig,
        queue: qConfig,
        messageType: msgType1,
        routingKeys: msgType1,
      });

      var conSeq = new Sequence.Consumer({ key: "id" });
      sub.use(conSeq.middleware);

      sub.use(function(msg, properties, actions){
        results.push(properties.headers["_rabbus_sequence"]);
        actions.next();
      });

      var subCount = 0;
      sub.subscribe(function(data){
        subCount += 1;
        if (subCount >= 2){
          done();
        }
      });

      function pubIt(){
        pub.publish({
          id: "1234asdf",
          foo: "bar"
        });

        pub.publish({
          id: "1234asdf",
          foo: "quux"
        });
      }

      sub.on("ready", pubIt);
    }, 5000);

    it("should process them in order", function(){
      var seq1 = results[0];
      expect(seq1.key).toBe("id");
      expect(seq1.value).toBe("1234asdf");
      expect(seq1.number).toBe(1);

      var seq2 = results[1];
      expect(seq2.key).toBe("id");
      expect(seq2.value).toBe("1234asdf");
      expect(seq2.number).toBe(2);
    });

    afterEach(function(){
      sub.stop();
      Sequence.DefaultStorage.clear("id", "1234asdf");
    });
  });
  
  describe("when a message does not have the specified key", function(){
    var pub, sub;
    var results = [];

    beforeEach(function(done){
      pub = new Rabbus.Publisher(wascally, {
        exchange: exConfig,
        messageType: msgType1
      });

      var sequencer = new Sequence.Producer({ key: "non-existent" });
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

    it("should not add sequence info", function(){
      var sequence = results[0];
      expect(sequence).toBe(undefined);
    });

    afterEach(function(){
      sub.stop();
      Sequence.DefaultStorage.clear("non-existent");
    });
  });
  
  describe("when processing a message without a sequence header", function(){
    var pub, sub;
    var handled = false;
    var results = [];

    beforeEach(function(done){
      pub = new Rabbus.Publisher(wascally, {
        exchange: exConfig,
        messageType: msgType1
      });

      sub = new Rabbus.Subscriber(wascally, {
        exchange: exConfig,
        queue: qConfig,
        messageType: msgType1,
        routingKeys: msgType1,
      });

      var subSeq = new Sequence.Consumer({ key: "id" });
      sub.use(subSeq.middleware);

      sub.subscribe(function(data){
        handled = true;
        done();
      });

      function pubIt(){
        pub.publish({
          id: "1234asdf",
          foo: "bar"
        });
      }

      sub.on("ready", pubIt);
    }, 5000);

    it("should not do anything with the message", function(){
      expect(handled).toBe(true);
    });

    afterEach(function(){
      sub.stop();
      Sequence.DefaultStorage.clear("id");
    });
  });
  
});
