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
    autoDelete: true,
    limit: 1,
    noBatch: true
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

  describe("when the second message arrives before the first", function(){
    var pub, sub, id;
    var handled = [];
    var rejectSpy;

    beforeEach(function(done){
      var now = Date.now();
      id = now.toString() + "." + Math.random(now);
      var subCount = 0;

      pub = new Rabbus.Publisher(wascally, {
        exchange: exConfig,
        messageType: msgType1
      });

      var prodSeq = new Sequence.Producer({ key: "id" });
      pub.use(prodSeq.middleware);

      // delay the first message
      pub.use(function(msg, headers, actions){
        var seq = headers["_rabbus_sequence"];
        var num = seq.number;

        switch(num) {
          case 1:
            seq.number = 2;
            break;
          case 2:
            seq.number = 1;
            break;
        }

        actions.next();
      });

      sub = new Rabbus.Subscriber(wascally, {
        exchange: exConfig,
        queue: qConfig,
        messageType: msgType1,
        routingKeys: msgType1,
      });

      sub.use(function(message, properties, actions){
        subCount += 1;
        if (subCount === 2){
          rejectSpy = spyOn(actions, "reject").and.callThrough();
          rejectSpy.and.callFake(function(){
            done();
          });
        }

        actions.next();
      });

      var conSeq = new Sequence.Consumer({ key: "id" });
      sub.use(conSeq.middleware);

      sub.use(function(msg, properties, actions){
        handled.push(properties.headers["_rabbus_sequence"]);
        actions.next();
      });

      sub.subscribe(function(data){});

      function pubIt(){
        pub.publish({
          id: id,
          foo: "bar"
        });

        pub.publish({
          id: id,
          foo: "quux"
        });
      }

      sub.on("ready", function(){
        setTimeout(pubIt, 500);
      });
    }, 5000);

    it("should process the second message", function(){
      var seq2 = handled[0];
      expect(seq2.key).toBe("id");
      expect(seq2.value).toBe(id);
      expect(seq2.number).toBe(2);
    });

    it("should reject the first message", function(){
      expect(rejectSpy).toHaveBeenCalled();
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
