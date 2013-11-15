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
    },

    setModels: function(models) {
        this.realWorker.setModels(models);
        this.emit('ready', this.realWorker.getQueueOptions(), false);
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