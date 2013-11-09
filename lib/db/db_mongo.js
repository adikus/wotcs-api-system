var cls = require('../base/class');
var MongoClient = require('mongodb').MongoClient;

module.exports = cls.Class.extend({

    init: function(url, callback) {
        this.url = url;
        this.ready = false;
        this.connected_callback = callback;
        this.connect();
    },

    connect: function() {
        var self = this;
        MongoClient.connect(this.url, function(err, db) {
            if(!err) {
                self.db = db;
            }
            if(self.connected_callback){
                self.connected_callback(err);
            }
        });
    }

});