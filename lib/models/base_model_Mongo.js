var Eventer = require('wotcs-api-system').Eventer;
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
            if(self[field] != self.oldParams[field]){
                changed = true;
            }
        });
        return changed;
    },

    save: function(fields) {
        var document = {};
        var self = this;

        if(this.newRecord){
            fields.push('created_at');
            this.created_at = new Date();
        }else{
            if(!this.hasChanged(fields)){
                return;
            }
        }
        if(this.timestamps){
            fields.push('updated_at');
            this.updated_at = new Date();
        }
        _.each(fields, function (field) {
            document[field] = self[field];
        });
        this.collection.save(document, function(err){
            if(err){
                console.log(err);
            }
        });

        this.newRecord = false;
    }

});