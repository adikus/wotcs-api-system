var Eventer = require('../base/eventer');
var path = require('path');
var _ = require('underscore');

module.exports = Eventer.extend({

    init: function(ws, file, rootDir, options) {
        this.rootDir = rootDir;
        this.workerFile = path.join(this.rootDir, file);
        this.realWorker = ws;
        this.callbackCounter = 0;
        this.type = 'client';
        this.options = options;

        var Worker = require(this.workerFile);
        this.dataWorker = new Worker(options);

        var self = this;
        this.realWorker.on('message', function(msg) {
            self.handleMessage(msg);
        });
        this.dataWorker.on('*',function(event) {
            self.emit.apply(self, arguments);
        });
        this.ready = _.after(2,function(queueOptions){
            if(!self.config.paused){
                self.emit('ready', queueOptions, false);
            }
        });
    },

    close: function() {
        _(this.dataWorker.getUnfinishedTasks()).each(function(ID){
            this.emit('fail-task', ID);
        }, this);
    },

    setModels: function(models) {
        this.dataWorker.setModels(models);
        this.ready(this.options);
    },

    setConfig: function(config) {
        var self = this;
        this.config = config;
        this.execute('setConfig', config, function(){
            self.ready(self.options);
        });
    },

    handleMessage: function(data) {
        var msg = JSON.parse(data);
        var action = msg.shift();
        if(action == 'emit'){
            this.emit.apply(this, msg);
        }else if(action == 'process-task'){
            this.dataWorker.processTask(msg.shift(), msg.shift());
        }
    },

    send: function(data) {
        this.realWorker.send(JSON.stringify(data), function(err) {
            if(err){
                console.log(err);
            }
        });
    },

    setTask: function(task) {
        var self = this;
        this.dataWorker.setTask(task, function(data) {
            self.send(['set-task',data]);
        });
    },

    execute: function() {
        var args = _.toArray(arguments) ;
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