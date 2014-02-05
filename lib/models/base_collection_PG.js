var cls = require('../base/class');
var _ = require('underscore');
var squel = require('squel');

module.exports = cls.Class.extend({

    init: function (app, constructor, name) {
        this.db = app.db.databases[this.dbName];
        this.app = app;
        this.constructor = constructor;
        this.tableName = this.toTableName(name);
        squel.useFlavour('postgres');
    },

    toTableName: function(name) {
        if(this.tableName){ return this.tableName; }
        var chars = name.split('');
        var ret = chars.shift().toLowerCase();
        _(chars).each(function(char) {
            if(char == char.toLowerCase()){
                ret += char;
            }else{
                ret += '_'+char.toLowerCase();
            }
        });
        return ret+'s';
    },

    where: function() {
        var self = this;
        var args = _.toArray(arguments);
        var where = args.shift();
        var callback = args.pop();
        var options = args.pop() || {};

        var q = squel.select().from(this.tableName).where.apply(this, where);
        if(options.order){
            if(typeof options.order == 'string'){
                q.order(options.order);
            }else{
                q.order.apply(this, options.order);
            }
        }
        if(options.limit){
            q.offset(options.limit[0]).limit(options.limit[1]);
        }
        this.db.query(q.toString(), function(err, results){
            callback(err, _.map(results ? results.rows : [], function(row) {
                return self.new(row, true);
            }));
        });
    },

    count: function() {
        var args = _.toArray(arguments);
        var callback = args.pop();
        var where = args.shift();
        var q = squel.select().field("COUNT(*) AS count").from(this.tableName);
        if(where){
            q.where.apply(this, where);
        }
        this.db.query(q.toString(), function(err, results){
            callback(err, results.rows[0].count);
        });
    },

    find: function(id, callback){
        var self = this;

        var q = squel.select().from(this.tableName).where("id = ?",id).limit(1);
        this.db.query(q.toString(), function(err, results){
            var record = results.rows.length > 0 ? self.new(results.rows[0], true) : null;
            callback(err, record);
        });
    },

    query: function(query, callback) {
        var self = this;
        this.db.query(query, function(err, results){
            callback(err, _.map(results ? results.rows : [], function(row) {
                return self.new(row, true);
            }));
        });
    },

    new: function (params, notNew) {
        var record = new this.constructor(this.db, this.app, params);
        record.tableName = this.tableName;
        record.newRecord = !notNew;
        record.oldParams = notNew ? params : null;
        return record;
    }

});