var Eventer = require('../base/eventer');
var _ = require('underscore');
var squel = require('squel');

module.exports = Eventer.extend({

    init: function (db, app, params) {
        this.db = db;
        this.app = app;
        var self = this;
        _.each(params, function(value, key) {
            self[key] = value;
        });
        if(this.id){
            this.id = parseInt(this.id,10);
        }
        squel.useFlavour('postgres');
    },

    hasChanged: function(fields) {
        var changed = false;
        var self = this;
        _.each(fields, function (field) {
            if(self[field] != self.oldParams[field]){
                changed = true;
            }
        });
        return changed;
    },

    save: function(fields, callback) {
        var query;
        var self = this;
        if(this.newRecord){
            query = squel.insert({replaceSingleQuotes: true}).into(this.tableName);
            if(this.id){
                fields.push('id');
            }
            if(this.timestamps){
                fields.push('created_at');
                self.created_at = (new Date()).toISOString();
            }
        }else{
            if(!this.hasChanged(fields)){
                if(this.forceChange){
                    fields = [];
                }else{
                    if(callback){
                        callback(null);
                    }
                    return;
                }
            }
            query = squel.update({replaceSingleQuotes: true}).table(this.tableName).where("id = ?", this.id);
        }
        if(this.timestamps){
            fields.push('updated_at');
            self.updated_at = (new Date()).toISOString();
        }
        this.oldParams = {};
        _.each(fields, function (field) {
            query.set(field, self[field]);
            self.oldParams[field] = self[field];
        });

        this.newRecord = false;
        //if(query.toString().indexOf('NaN') > -1/* || query.toString().toLowerCase().indexOf('infinity') > -1*/){
        //    console.log(query.toString());
        //}else{
            this.db.batchQuery(query.toString(), this.tableName, callback);
        //}
    }

});