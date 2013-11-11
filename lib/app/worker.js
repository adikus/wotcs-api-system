var Eventer = require('../base/eventer');
var DB = require('../db');
var _ = require('underscore');
var cluster = require('cluster');
var path = require('path');
var WebSocket = require('ws');

module.exports = Eventer.extend({

    init: function(dir, config) {
        this.rootDir = dir;
        this.config = config;
        this.isMaster = cluster.isMaster;

        var self = this;
        this.once('db.connected', function() {
            self.models = require('../models')(self);
            _.each(self.models,  function(model, name) {
                self[name] = model;
            });
        });

        this.ws = new WebSocket(this.config.worker.url);
        this.ws.on('open', function() {
            self.executeNowOrOnce(self.db.ready, 'db.connected', function(){
                self.models = require('../models')(self);
                this.worker.setModels(this.models);
                self.send(['server-worker']);
                console.log('Worker ready');
            });

        });
        this.ws.on('message', function(data) {
            self.handleMessage(JSON.parse(data));
        });

        this.setupDatabases(config.db);
    },

    send: function(data){
        var msg = JSON.stringify(data);
        this.ws.send(msg);
    },

    handleMessage: function(msg) {
        var self = this;
        var action = msg.shift();
        if(action == 'emit'){
            this.emit.apply(this, msg);
        }else if(action == 'set-task'){
            this.worker.setTask(msg.shift());
        }else if(action == 'execute'){
            var ID = msg.shift();
            var method = msg.shift();
            var data = this.worker ? this.worker[method].apply(this.worker, msg): {error: 'Worker not initialised'};
            self.send(['emit', 'executed.'+ID, data]);
        }else if(action == 'executeAsync'){
            var ID = msg.shift();
            var method = msg.shift();

            msg.push(function() {
                var args = _.toArray(arguments) ;
                args.unshift('emit', 'executed.'+ID);
                self.send(args);
            });
            if(this.worker){
                this.worker[method].apply(this.worker, msg);
            }else{
                self.send(['emit', 'executed.'+ID, {error: 'Worker not initialised'}]);
            }
        }
    },

    setup: function(n, file){
        var self = this

        this.workerFile = path.join(this.rootDir, file);
        var Worker = require(this.workerFile);
        this.worker = new Worker();
        this.worker.on('*',function(event) {
            var args = _(arguments).toArray();
            args.unshift('emit');
            self.send(args);
        });

        if(this.isMaster){
            _(n-1).times(function(){
                cluster.fork();
            });
        }
    },

    setupDatabases: function(databases) {
        this.db = new DB(databases);
        this.propagateEvents('db');
    }

});