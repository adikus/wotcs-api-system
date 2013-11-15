var Eventer = require('../base/eventer');
var DB = require('../db');
var _ = require('underscore');
var cluster = require('cluster');
var path = require('path');

module.exports = Eventer.extend({

    init: function(dir, config) {
        this.rootDir = dir;
        this.config = config;
        this.isMaster = false;

        var self = this;
        this.once('db.connected', function() {
            self.models = require('../models')(self);
            _.each(self.models,  function(model, name) {
                self[name] = model;
            });
            process.send(['waiting']);
        });
        process.on('message', function(msg) {
            self.handleMessage(msg);
        });

        this.setupDatabases(config.db);
    },

    handleMessage: function(msg) {
        var action = msg.shift();
        if(action == 'emit'){
            this.emit.apply(this, msg);
        }else if(action == 'assign-worker'){
            this.createWorker(msg.shift());
        }else if(action == 'set-task'){
            this.worker.setTask(msg.shift());
        }else if(action == 'execute'){
            var ID = msg.shift();
            var method = msg.shift();
            var data = this.worker ? this.worker[method].apply(this.worker, msg): {error: 'Worker not initialised'};
            process.send(['emit', 'executed.'+ID, data]);
        }else if(action == 'executeAsync'){
            var ID = msg.shift();
            var method = msg.shift();

            msg.push(function() {
                var args = _.toArray(arguments) ;
                args.unshift('emit', 'executed.'+ID);
                process.send(args);
            });
            if(this.worker){
                this.worker[method].apply(this.worker, msg);
            }else{
                process.send(['emit', 'executed.'+ID, {error: 'Worker not initialised'}]);
            }
        }
    },

    createWorker: function(file){
        this.workerFile = path.join(this.rootDir, file);
        var Worker = require(this.workerFile);
        this.worker = new Worker();
        this.worker.on('*',function(event) {
            var args = _.toArray(arguments);
            args.unshift('emit');
            process.send(args);
        });
        this.worker.setModels(this.models);
        process.send(['emit', 'ready', this.worker.getQueueOptions()]);
    },

    setupDatabases: function(databases) {
        this.db = new DB(databases);
        this.propagateEvents('db');
    }

});