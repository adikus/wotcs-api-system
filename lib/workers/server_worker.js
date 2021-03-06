var Eventer = require('../base/eventer');
var _ = require('underscore');

module.exports = Eventer.extend({

    init: function(ws, options) {
        this.realWorker = ws;
        this.callbackCounter = 0;
        this.type = 'server';
        this.options = options;

        var self = this;
        this.realWorker.on('message', function(msg) {
            self.handleMessage(msg);
        });
    },

    handleMessage: function(data) {
        var msg = JSON.parse(data);
        var action = msg.shift();
        if(action == 'emit'){
            this.emit.apply(this, msg);
        }
    },

    setConfig: function(config) {
        var self = this;
        this.execute('setConfig', config, function(){
            if(!config.paused){
                self.emit('ready', self.options, false);
            }
        });
    },

    send: function(data) {
        this.realWorker.send(JSON.stringify(data));
    },

    setTask: function(task) {
        this.send(['set-task',task]);
    },

    execute: function() {
        var args = _.toArray(arguments);
        var callback = args.pop();
        var method = args.shift();

        var msg = ['execute', this.callbackCounter, method];
        msg.push.apply(msg,args);

        this.send(msg);
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

        this.send(msg);
        this.once('executed.'+this.callbackCounter++, function() {
            var args = _.toArray(arguments);
            var event = args.shift();
            callback.apply(null, args);
        });
    }
});