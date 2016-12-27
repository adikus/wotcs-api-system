var cls = require('../base/class');
var pg = require('pg');
var url = require('url');
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
        const params = url.parse(this.url);
        const auth = params.auth.split(':');

        var self = this;

        const config = {
            user: auth[0],
            password: auth[1],
            host: params.hostname,
            port: params.port,
            database: params.pathname.split('/')[1],
            ssl: true,
            max: 3,
            idleTimeoutMillis: 30000,
        };
        this.pool = new pg.Pool(config);

        this.pool.connect(function(err, client, done) {
            if(!err) {
                done();
                console.log('PG pool established...')
                pg.connect(self.url, function(err, client, done) {
                    if(!err) {
                        self.client = client;
                        self.done_callback = done;
                    }
                    if(self.connected_callback){
                        self.connected_callback(err);
                    }
                });
            }
        });
    },

    query: function(query, callback, tableName) {
        var start = new Date();

        this.pool.connect(function(err, client, done) {
            if(err) {
                console.error('Error aquiring connection from pool', err, query);
                done();
                return callback(err, null);
            }
            client.query(query, function(err, results) {
                if(err) {
                    console.error('Error running query', err, query);
                    return callback(err, null);
                }
                var duration = ((new Date()).getTime() - start.getTime()) + 'ms';
                tableName = tableName || '';
                var method = query.split(' ')[0];
                if(method != 'SELECT' && method != 'WITH'){
                    console.log(method, results.rowCount, tableName, duration);
                }
                done();
                callback(err, results);
            });
        });
    },

    batchQuery: function(query, tableName, callback) {
        var method = query.split(' ')[0];
        this.addQueryToBatch(query, method, tableName, callback);
    },

    addQueryToBatch: function(query, method, tableName, callback) {
        if(!this.queues[tableName]){
            this.queues[tableName] = {};
        }
        if(!this.queues[tableName][method]){
            this.queues[tableName][method] = [];
        }
        this.queues[tableName][method].push({query: query, callback: callback});
    },

    step: function() {
        var self = this;
        _.each(this.queues, function(table, tableName) {
            _.each(table, function(methodQueue, method){
                if(methodQueue.length > 0){
                    var start = new Date();
                    var queue = _.clone(methodQueue);
                    self.queues[tableName][method] = [];
                    var query = _(queue).pluck('query').join(';');
                    self.client.query(query, function(err) {
                        var duration = ((new Date()).getTime() - start.getTime()) + 'ms';
                        console.log('Batch', method, queue.length, tableName, duration);
                        if(err) {
                            console.error('Error running query', err, query);
                        }
                        _(_(queue).pluck('callback')).each(function(callback){
                            if(callback){
                                callback(err);
                            }
                        });
                    });
                }
            });
        });
    }

});

