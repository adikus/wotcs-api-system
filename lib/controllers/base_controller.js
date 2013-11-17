var cls = require("../base/class");
var _ = require('underscore');

module.exports = cls.Class.extend({

    init: function () {
        this.action = 'index';
        this.startedAt = new Date();
    },

    setModels: function(models){
        this.models = models;
        _.each(this.models,  function(model, name) {
            this[name] = model;
        },this);
    },

    callAction: function (action) {
        this.action =  action || this.action;
        if(typeof this[this.action] !== 'function'){
            this.res.status(404);
            this.render('error', {title: 'Error', error: 'Action not found ('+this.action+').'});
            return;
        }
        return this[this.action](this.req, this.res);
    },

    store: function(data, maxAge) {
        this.router.store[this.req._parsedUrl.path] = {
            data: data,
            created: new Date(),
            lastAccessed: new Date(),
            maxAge: maxAge
        };
    },

    updateStoreOn: function(event, callback) {
        var self = this;
        var ID = this.workerManager.on(event, function() {
            callback.apply(self.router.store[self.req._parsedUrl.path], arguments);
        });
        this.router.store[this.req._parsedUrl.path].update = {
            callbackID: ID,
            event: event
        };
    },

    render: function(view, data){
        data.base = {
            JSFiles: this.assetConfig.JSFiles
        };
        this.res.render(view, data);
    },

    dependencies: function(dependencies){
        var self = this;
        _.each(dependencies,function(dep, name){
            self[name] = dep;
        });
    }

});