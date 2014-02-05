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
        this.cache = {};
        this.assetConfig = assetConfig;
        this.stats = {};
        var self = this;
        setInterval(function(){
            self.emit('stats',self.getStats(),true);
            self.removeOldCaches();
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
        this.addToStats(req, route);
    },

    addToStats: function(req, route) {
        if(req.headers['sec-websocket-version']){
            var name = 'WS';
        }else{
            var name = route.controller + '#' + route.action;
        }
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

    removeOldCaches: function() {
        var counter = 0;
        _.each(this.cache, function(cache, key) {
            var age = (new Date()).getTime() - cache.lastAccessed.getTime();
            if(age > cache.maxAge){
                if(cache.onClose()){
                    counter++;
                    delete this.cache[key];
                }
            }
        }, this);
        if(counter){ console.log('Removed',counter,'entries from cache'); }
    },

    setCache: function(key, obj) {
        this.cache[key] = obj;
    },

    getCache: function(key) {
        return this.cache[key];
    }

});