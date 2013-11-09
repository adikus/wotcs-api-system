var Eventer = require('../base/eventer');
var cluster = require('cluster');
var LocalWorker = require('./local_worker');
var ClusterWorker = require('./cluster_worker');

module.exports = Eventer.extend({

    init: function(queue, rootDir) {
        this.localWorker = false;
        this.rootDir = rootDir;
        this.workers = {};
        this.workerCounter = 0;
        this.queue = queue;
        this.propagateEvents('queue');
    },

    setModels: function(models){
        if(this.localWorker){
            this.localWorker.setModels(models);
        }
    },

    addWorker: function(file) {
        var worker = this.localWorker ? new ClusterWorker(file, cluster.fork()) : new LocalWorker(file, this.rootDir);

        if(!this.localWorker){
            this.localWorker = worker;
        }
        this.setupWorker(worker);
        this.workers[this.workerCounter] = worker;
        this.propagateEvents('workers', this.workerCounter++);
    },

    setupWorker: function(worker) {
        var self = this;
        worker.on('ready', function() {
            self.queue.getFromQueue(function(task){
                worker.setTask(task);
            })
        });
        worker.on('finish-task', function(event, ID){
            self.queue.confirmSuccess(ID);
        });
        worker.on('fail-task', function(event, ID){
            self.queue.reportFail(ID);
        });
    }

});