var Eventer = require('../base/eventer');
var _ = require('underscore');

module.exports = Eventer.extend({

    init: function (collection, app, params) {
        this.collection = collection;
        this.app = app;
        var self = this;
        _.each(params, function(value, key) {
            self[key] = value;
        });
    },

    hasChanged: function(fields) {
        var changed = false;
        var self = this;
        _.each(fields, function (field) {
            if(!self.oldParams || self[field] != self.oldParams[field]){
                changed = true;
            }
        });
        return changed;
    },

    save: function(fields, callback) {
        var document = {};
        var self = this;

        if(this.newRecord && this.timestamps){
            if(this.shortKeys){
                fields.push('c');
                this.c = new Date();
            }else{
                fields.push('created_at');
                this.created_at = new Date();
            }
        }else{
            if(!this.hasChanged(fields)){
                callback(null);
                return;
            }
        }
        if(this.timestamps){
            if(this.shortKeys){
                fields.push('u');
                this.u = new Date();
            }else{
                fields.push('updated_at');
                this.updated_at = new Date();
            }
        }
        if(this._id){
            fields.push('_id');
        }
        _.each(fields, function (field) {
            document[field] = self[field];
        });
        this.collection.save(document, {safe: true}, function(err){
            if(callback){
                callback(err);
            }
        });

        this.newRecord = false;
    }

});