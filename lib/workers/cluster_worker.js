var Eventer = require('../base/eventer');
var _ = require('underscore');

module.exports = Eventer.extend({

    init: function(file, realWorker) {
        this.workerFile = file;
        this.realWorker = realWorker;
        this.callbackCounter = 0;
        this.type = 'cluster';

        var self = this;
        this.realWorker.on('message', function(msg) {
            self.handleMessage(msg);
        });
    },

    handleMessage: function(msg) {
        var action = msg.shift();
        if(action == 'emit'){
            this.emit.apply(this, msg);
        }else if(action == 'waiting'){
            this.realWorker.send(['assign-worker',this.workerFile,this.config]);
            this.emit('assign-worker');
        }
    },

    setConfig: function(config) {
        this.config = config;
    },

    setTask: function(task) {
        this.realWorker.send(['set-task',task]);
    },

    execute: function() {
        var args = _.toArray(arguments) ;
        var callback = args.pop();
        var method = args.shift();

        var msg = ['execute', this.callbackCounter, method];
        msg.push.apply(msg,args);

        this.realWorker.send(msg);
        this.once('executed.'+this.callbackCounter++, function() {
            var args = _.toArray(arguments);
            var event = args.shift();
            callback.apply(null, args);
        });
    },

    executeAsync: function() {
        var args = _.toArray(arguments) ;
        var callback = args.pop();
        var method = args.shift();

        var msg = ['executeAsync', this.callbackCounter, method];
        msg.push.apply(msg,args);

        this.realWorker.send(msg);
        this.once('executed.'+this.callbackCounter++, function() {
            var args = _.toArray(arguments);
            var event = args.shift();
            callback.apply(null, args);
        });
    }
});