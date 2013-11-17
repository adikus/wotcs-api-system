var Eventer = require('../base/eventer');
var path = require('path');
var _ = require('underscore');

module.exports = Eventer.extend({

    init: function(file, rootDir) {
        var self = this;
        this.rootDir = rootDir;
        this.workerFile = path.join(this.rootDir, file);
        this.type = 'local';
        var Worker = require(this.workerFile);
        this.realWorker = new Worker();
        this.realWorker.on('*',function(event) {
            self.emit.apply(self, arguments);
        });
        this.ready = _.after(2,function(queueOptions){
            if(!self.realWorker.config.paused){
                self.emit('ready', queueOptions, false);
            }
        });
    },

    setModels: function(models) {
        this.realWorker.setModels(models);
        this.ready(this.realWorker.getQueueOptions());
    },

    setConfig: function(config) {
        this.realWorker.setConfig(config);
        this.ready(this.realWorker.getQueueOptions());
    },

    setTask: function(task) {
        this.realWorker.setTask(task);
    },

    execute: function() {
        var args = _.toArray(arguments) ;
        var callback = args.pop();
        var method = args.shift();
        callback(this.realWorker[method].apply(this.realWorker, args));
    },

    executeAsync: function() {
        var args = _.toArray(arguments) ;
        var callback = args.pop();
        var method = args.shift();
        args.push(function() {
            callback.apply(null, arguments);
        });
        this.realWorker[method].apply(this.realWorker, args);
    }

});