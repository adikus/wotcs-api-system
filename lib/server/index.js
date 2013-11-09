var Eventer = require('../base/eventer');
var express = require('express');
var http = require('http');
var path = require('path');
var _ = require("underscore");

module.exports = Eventer.extend({

    init: function(config, rootDir) {
        this.config = config;
        this.expressApp = express();
        this.rootDir = rootDir;
        this.configureExpress();
        this.configureServer();
    },

    configureExpress: function(){
        var app = this.expressApp;
        app.set('port', this.config.port);
        app.set('views', path.join(this.rootDir, 'views'));
        app.set('view engine', 'jade');

        app.use(express.compress());
        app.use(express.favicon(this.rootDir + '/public/images/favicon.ico'));
        app.use(express.logger('dev'));
        app.use(express.json());
        app.use(express.urlencoded());
        app.use(express.cookieParser(this.config.cookieSecret));
        app.use(express.methodOverride());
        app.use(app.router);
        app.use(require('less-middleware')({ src: path.join(this.rootDir, 'public') }));
        app.use(express.static(path.join(this.rootDir, 'public')));
        app.use(express.static(path.join(__dirname,'..','public')));

        if ('production' != app.get('env')) {
            app.use(express.errorHandler());
        }
    },

    configureRoutes: function(router){
        var app = this.expressApp;
        _.each(router.routes, function(route, key) {
            var path = key.split(' ')[1];
            app[route.method](path, function(req, res){
                router.route(route, req, res);
            });
        });
        console.log('Server routes configured');
    },

    configureServer: function(){
        var self = this;
        var app = this.expressApp;
        this.server = http.createServer(app).listen(app.get('port'), function(){
            console.log('Express server listening on port ' + app.get('port'));

            self.emit('ready');
        });
    }

});