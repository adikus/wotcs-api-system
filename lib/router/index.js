var cls = require("../base/class");
var path = require('path');
var _ = require('underscore');

module.exports = cls.Class.extend({

    init: function(controllers, rootDir) {
        this.controllers = controllers;
        this.rootDir = rootDir;
        this.routes = {};
        this.rawRoutes = require(path.join(this.rootDir, 'routes'));
        this.configureRoutes();
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

    route: function(route, req, res) {
        var controllerName = route.controller;
        var actionName = route.action;
        if(!this.controllers[controllerName]){
            res.status(404).render('error', {error: 'Controller not found ('+controllerName+').'});
            return;
        }
        var controller = new this.controllers[controllerName]();
        controller.dependencies({
            res: res,
            req: req,
            workerManager: this.workerManager
        });
        controller.setModels(this.models);
        controller.callAction(actionName);
    }

});