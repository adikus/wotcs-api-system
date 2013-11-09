var cls = require('../base/class');
var pg = require('pg');
var _ = require('underscore');

module.exports = cls.Class.extend({

    init: function(url, callback) {
        this.url = url;
        this.ready = false;
        this.connected_callback = callback;
        this.connect();
        this.queues = {};
        var self = this;
        setInterval(function() {
            self.step();
        },5000);
    },

    connect: function() {
        var self = this;
        pg.connect(this.url, function(err, client, done) {
            if(!err) {
                self.client = client;
                self.done_callback = done;
            }
            if(self.connected_callback){
                self.connected_callback(err);
            }
        });
    },

    query: function(query, callback, tableName) {
        var start = new Date();
        this.client.query(query, function(err, results) {
            if(err) {
                console.error('Error running query', err, query);
            }else{
                var duration = ((new Date()).getTime() - start.getTime()) + 'ms';
                tableName = tableName || '';
                var method = query.split(' ')[0];
                if(method != 'SELECT'){
                    console.log(method, results.rowCount, tableName, duration);
                }
            }
            callback(err, results);
        });
    },

    batchQuery: function(query, tableName) {
        var method = query.split(' ')[0];
        this.addQueryToBatch(query, method, tableName);
    },

    addQueryToBatch: function(query, method, tableName) {
        if(!this.queues[tableName]){
            this.queues[tableName] = {};
        }
        if(!this.queues[tableName][method]){
            this.queues[tableName][method] = [];
        }
        this.queues[tableName][method].push(query);
    },

    step: function() {
        var self = this;
        _.each(this.queues, function(table, tableName) {
            _.each(table, function(methodQueue, method){
                if(methodQueue.length > 0){
                    var start = new Date();
                    var queue = _.clone(methodQueue);
                    self.queues[tableName][method] = [];
                    var query = queue.join(';');
                    self.client.query(query, function(err) {
                        var duration = ((new Date()).getTime() - start.getTime()) + 'ms';
                        console.log('Batch', method, queue.length, tableName, duration);
                        if(err) {
                            console.error('Error running query', err, query);
                        }
                    });
                }
            });
        });
    }

});