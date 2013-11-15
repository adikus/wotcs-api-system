var Eventer = require('../base/eventer');
var cluster = require('cluster');
var LocalWorker = require('./local_worker');
var ClusterWorker = require('./cluster_worker');
var ServerWorker = require('./server_worker');
var ClientWorker = require('./client_worker');
var _ = require('underscore');

module.exports = Eventer.extend({

    init: function(queue, rootDir, clientFile, config) {
        this.config = config;
        this.localWorker = false;
        this.clientFile = clientFile;
        this.rootDir = rootDir;
        this.workers = {};
        this.workerCounter = 0;
        this.queue = queue;
        this.propagateEvents('queue');
    },

    setModels: function(models){
        this.models = models;
        _.each(this.workers, function(worker) {
            if(worker.type == 'local' || worker.type == 'client'){
                worker.setModels(models);
            }
        });
    },

    forAll: function(callback){
        _.each(this.workers, function(worker, ID){
            callback(worker, ID);
        });
    },

    addWorker: function(file) {
        var self = this;
        var ID = this.workerCounter++;
        var worker = this.localWorker ? new ClusterWorker(file, cluster.fork()) : new LocalWorker(file, this.rootDir);

        if(!this.localWorker){
            this.localWorker = worker;
        }else{
            worker.realWorker.on('disconnect', function(){
                delete self.workers[ID];
                self.emit('workers.remove-worker',{type: 'local', workers: self.getWorkersByType(), ID:ID}, true);
                self.addWorker(file);
            });
        }
        this.setupWorker(worker, ID);
        this.workers[ID] = worker;
        this.emit('workers.add-worker',{type: 'local', workers: this.getWorkersByType()}, true);
        this.propagateEvents('workers', ID);
    },

    getWorkersByType: function() {
        var ret = {local: [], server: [], client: []};
        _(this.workers).each(function(worker, ID){
            var type = worker.type;
            if(type == 'cluster'){type='local';}
            ret[type].push(ID);
        });
        return ret;
    },

    addServerWorker: function(ws, options) {
        var ID = this.workerCounter++;
        var worker = new ServerWorker(ws, options);

        this.queue.getFromQueue(function(task){
            worker.setTask(task);
        }, ID, options);

        this.setupWorker(worker, ID);
        this.workers[ID] = worker;
        this.emit('workers.add-worker',{type: 'server', workers: this.getWorkersByType()}, true);

        var self = this;
        ws.on('close', function() {
            console.log('Server worker disconnected');
            delete self.workers[ID];
            self.emit('workers.remove-worker',{type: 'server', workers: self.getWorkersByType(), ID:ID}, true);
        });

        this.propagateEvents('workers', ID);
    },

    addClientWorker: function(ws, options) {
        if(!options || options.version != this.config.version){
            ws.close(1000, 'close');
            return;
        }
        var count = this.getWorkersByType().client.length;
        if(this.config.clientLimit <= count){
            ws.close(1000, 'client-limit');
            return;
        }
        var ID = this.workerCounter++;
        var worker = new ClientWorker(ws, this.clientFile, this.rootDir, options);

        this.setupWorker(worker, ID);
        this.workers[ID] = worker;
        this.emit('workers.add-worker',{type: 'client', workers: this.getWorkersByType()}, true);

        var self = this;
        ws.on('close', function() {
            console.log('Client worker disconnected');
            delete self.workers[ID];
            self.emit('workers.remove-worker',{type: 'client', workers: self.getWorkersByType(), ID:ID}, true);
        });

        this.propagateEvents('workers', ID);

        if(this.models){
            worker.setModels(this.models);
        }
    },

    setupWorker: function(worker, ID) {
        var self = this;
        worker.on('ready', function(event, options) {
            self.queue.getFromQueue(function(task){
                worker.setTask(task);
            }, ID, options);
        });
        worker.on('finish-task', function(event, ID, data){
            self.queue.confirmSuccess(ID, data);
        });
        worker.on('fail-task', function(event, ID, data){
            self.queue.reportFail(ID, data);
        });
    }

});