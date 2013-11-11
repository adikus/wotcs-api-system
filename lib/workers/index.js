var Eventer = require('../base/eventer');
var cluster = require('cluster');
var LocalWorker = require('./local_worker');
var ClusterWorker = require('./cluster_worker');
var ServerWorker = require('./server_worker');
var ClientWorker = require('./client_worker');
var _ = require('underscore');

module.exports = Eventer.extend({

    init: function(queue, rootDir, clientFile) {
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

    addWorker: function(file) {
        var worker = this.localWorker ? new ClusterWorker(file, cluster.fork()) : new LocalWorker(file, this.rootDir);

        if(!this.localWorker){
            this.localWorker = worker;
        }
        this.setupWorker(worker);
        this.workers[this.workerCounter] = worker;
        this.emit('workers.add-worker',{type: 'local', ID: this.workerCounter}, true);
        this.propagateEvents('workers', this.workerCounter++);
    },

    addServerWorker: function(ws) {
        var ID = this.workerCounter++;
        this.emit('workers.add-worker',{type: 'server', ID: ID}, true);
        var worker = new ServerWorker(ws);

        this.queue.getFromQueue(function(task){
            worker.setTask(task);
        });

        this.setupWorker(worker);
        this.workers[ID] = worker;

        var self = this;
        ws.on('close', function() {
            console.log('Server worker disconnected');
            delete self.workers[ID];
            self.emit('workers.remove-worker',{ID: ID}, true);
        });

        this.propagateEvents('workers', ID);
    },

    addClientWorker: function(ws) {
        var ID = this.workerCounter++;
        this.emit('workers.add-worker',{type: 'client', ID: ID}, true);
        var worker = new ClientWorker(ws, this.clientFile, this.rootDir);

        this.setupWorker(worker);
        this.workers[ID] = worker;

        var self = this;
        ws.on('close', function() {
            console.log('Client worker disconnected');
            delete self.workers[ID];
            self.emit('workers.remove-worker',{ID: ID}, true);
        });

        this.propagateEvents('workers', ID);

        if(this.models){
            worker.setModels(this.models);
        }
    },

    setupWorker: function(worker) {
        var self = this;
        worker.on('ready', function() {
            self.queue.getFromQueue(function(task){
                worker.setTask(task);
            });
        });
        worker.on('finish-task', function(event, ID){
            self.queue.confirmSuccess(ID);
        });
        worker.on('fail-task', function(event, ID){
            self.queue.reportFail(ID);
        });
    }

});