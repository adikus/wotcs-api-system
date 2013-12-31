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
            return null;
        }
        return this[this.action](this.req, this.res);
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
    },

    longPoleFromCache: function(cache, getterMethod, options){
        var pollingOptions = options.polling || {};
        var self = this;
        this.sent = false;
        var callback = cache.once(pollingOptions.event || 'done', function() {
            clearTimeout(timeout);
            if(!self.sent){
                self.res.json( cache[getterMethod](options) );
                self.sent = true;
            }
        });
        var timeout = setTimeout(function() {
            cache.unsetCallback(pollingOptions.event || 'done', callback);
            if(!self.sent){
                self.res.json( cache[getterMethod](options) );
                self.sent = true;
            }
        }, 5000);
    },

    setCache: function(key, obj) {
        this.router.setCache(key, obj);
    },

    getCache: function(key) {
        return this.router.getCache(key);
    }

});