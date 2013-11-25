var Eventer = require('../base/eventer');
var path = require('path');
var _ = require('underscore');

module.exports = Eventer.extend({

    init: function(controllers, rootDir, assetConfig) {
        this.controllers = controllers;
        this.rootDir = rootDir;
        this.routes = {};
        this.rawRoutes = require(path.join(this.rootDir, 'routes'));
        this.configureRoutes();
        this.store = {};
        this.assetConfig = assetConfig;
        this.stats = {};
        var self = this;
        setInterval(function(){
            self.emit('stats',self.getStats(),true);
        },1000);
    },

    configureRoutes: function() {
        _.each(this.rawRoutes.get, function(route, key){
            this.configureRoute(route, key, 'get');
        },this);
        _.each(this.rawRoutes.post, function(route, key){
            this.configureRoute(route, key, 'post');
        },this);
    },

    configureRoute: function( route, key, method){
        var routeSplit = route.split('#');
        var controller = routeSplit[0];
        var action = routeSplit[1];
        this.routes[method+' '+key] = {
            method: method,
            controller: controller,
            action: action
        };
    },

    setModels: function(models) {
        this.models = models;
    },

    setIncludedJS: function(files) {
        this.assetConfig.JSFiles =_(files).map(function(file){
            var last = _(file.split('\\')).last();
            last = _(last.split('/')).last();
            return last;
        });
    },

    route: function(route, req, res) {
        if(this.store[req._parsedUrl.path]){
            console.log('Load from data store');
            this.store[req._parsedUrl.path].lastAccessed = new Date();
            res.json(this.store[req._parsedUrl.path].data);
        }else{
            var controllerName = route.controller;
            var actionName = route.action;
            if(!this.controllers[controllerName]){
                res.status(404).render('error', {
                    title: 'Error',
                    error: 'Controller not found ('+controllerName+').',
                    base: {
                        JSFiles: this.assetConfig.JSFiles}
                    });
                console.log(this.assetConfig.JSFiles);
                return;
            }
            var controller = new this.controllers[controllerName]();
            controller.dependencies({
                assetConfig: this.assetConfig,
                res: res,
                req: req,
                workerManager: this.workerManager,
                router: this
            });
            controller.setModels(this.models);
            controller.callAction(actionName);
        }
        this.removeOldStores();
        this.addToStats(route);
    },

    addToStats: function(route) {
        var name = route.controller + '#' + route.action;
        if(!this.stats[name]){
            this.stats[name] = [];
        }
        this.stats[name].push(new Date());
    },

    getStats: function() {
        var now = new Date();
        _(this.stats).each(function(stats, key){
            while(stats.length > 0 && now.getTime() - 60*1000 > stats[0].getTime()){
                stats.shift();
            }
            if(stats.length == 0){
                delete this.stats[key];
            }
        }, this);
        var values = _(this.stats).map(function(stats) {
            return stats.length;
        });
        return _.object(_(this.stats).keys(), values);
    },

    removeOldStores: function() {
        _.each(this.store, function(store, key) {
            var age = (new Date()).getTime() - store.lastAccessed.getTime();
            if(age > store.maxAge){
                console.log('Delete',key, 'from data store');
                this.workerManager.unsetCallback(this.store[key].update.event, this.store[key].update.callbackID);
                delete this.store[key];
            }
        }, this);
    }

});