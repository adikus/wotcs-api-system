var cls = require("../base/class");
var _ = require('underscore');

module.exports = cls.Class.extend({

    init: function (app, constructor, name) {
        this.db = app.db.databases[this.dbName].db;
        this.app = app;
        var self = this;
        this.db.collection(name.toLowerCase()+'s', function(err, collection) {
            if(err){
                console.log('Error retrieving collection',err);
            }else{
                self.collection = collection;
            }
        });
        this.constructor = constructor;
    },

    where: function(where, options, callback) {
        var self = this;
        var ret = [];

        var cursor = this.collection.find(where);
        if(_.isFunction(options) && !callback){
            callback = options;
        }else if(options.order){
            cursor.sort(options.order);
        }else if(options.limit){
            cursor.limit(options.limit);
        }
        var stream = cursor.stream();
        stream.on("data", function(item) {
            ret.push(self.new(item, true));
        });
        stream.on("end", function(err) {
            callback(err, ret);
        });
    },

    find: function(id, callback){
        var self = this;

        this.collection.findOne({_id: id}, function(err, result){
            var record = result ? self.new(result, true) : null;
            callback(err, record);
        });
    },

    new: function (params, notNew) {
        var record = new this.constructor(this.collection, this.app, params);
        record.newRecord = !notNew;
        record.oldParams = notNew ? params : null;
        return record;
    }

});