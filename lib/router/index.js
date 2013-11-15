var cls = require("../base/class");
var path = require('path');
var _ = require('underscore');

module.exports = cls.Class.extend({

    init: function(controllers, rootDir, assetConfig) {
        this.controllers = controllers;
        this.rootDir = rootDir;
        this.routes = {};
        this.rawRoutes = require(path.join(this.rootDir, 'routes'));
        this.configureRoutes();
        this.store = {};
        this.assetConfig = assetConfig;
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
                res.status(404).render('error', {title: 'Error', error: 'Controller not found ('+controllerName+').'});
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
    },

    removeOldStores: function() {
        _.each(this.store, function(store, key) {
            var age = (new Date()).getTime() - store.lastAccessed.getTime();
            if(age > 5000/*store.maxAge*/){
                console.log('Delete',key, 'from data store');
                this.workerManager.unsetCallback(this.store[key].update.event, this.store[key].update.callbackID);
                delete this.store[key];
            }
        }, this);
    }

});