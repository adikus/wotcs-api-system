var Eventer = require('../base/eventer');
var DB = require('../db');
var Server = require('../server');
var WebsocketServer = require('../server/ws');
var _ = require('underscore');
var Router = require('../router');
var WorkerManager = require('../workers');
var chokidar = require('chokidar');
var path = require('path');
var exec = require('child_process').exec;
var UglifyJS = require("uglify-js");
var fs = require('fs');

module.exports = Eventer.extend({

    init: function(dir, config) {
        this.rootDir = dir;
        this.config = config;
        this.isMaster = true;
        var self = this;
        this.once('db.connected', function() {
            self.models = require('../models')(self);
            self.distributeModels();
            self.queue.fillQueue();

            if(self.dev){
                var watcher = chokidar.watch(path.join(this.rootDir, 'models'));
                watcher.on('change', function(path) {
                    console.log('Models reloaded');
                    delete require.cache[require.resolve('../models')];
                    self.models = require('../models')(self, true);
                    self.distributeModels();
                });
            }
        });
        this.router = new Router(require('../controllers')(this.rootDir), this.rootDir);
        this.dev = process.env.ENV != 'production';
        if(this.dev){
            var watcher = chokidar.watch(path.join(this.rootDir, 'controllers'));
            watcher.on('change', function() {
                console.log('Controllers reloaded');
                delete require.cache[require.resolve('../controllers')];
                self.router.controllers = require('../controllers')(self.rootDir, true);
            });
        }

        this.setupDatabases(this.config.db);
        this.setupServer(this.config.server);

        this.compileJS();
    },

    distributeModels: function() {
        _.each(this.models,  function(model, name) {
            this[name] = model;
        },this);
        this.queue.setModels(this.models);
        this.workerManager.setModels(this.models);
        this.router.setModels(this.models);
    },

    setupDatabases: function(databases) {
        this.db = new DB(databases);
        this.propagateEvents('db');
    },

    setupServer: function(config) {
        var self = this;
        this.server = new Server(config, this.rootDir);
        this.executeNowOrOnce(this.db.ready, 'db.connected', function(){
            self.server.configureRoutes(self.router);
            self.websocketServer = new WebsocketServer(self.server, self.workerManager, self.config.ws);
        });
    },

    setupWorkers: function(count, file, queue){
        this.queue = queue;
        this.workerManager = new WorkerManager(queue, this.rootDir);
        this.router.workerManager = this.workerManager;
        for(var i = 0; i < count; i++){
            this.workerManager.addWorker(file);
        }
    },

    compileJS: function() {
        if(!this.dev){
            console.log('Precompiling JS');
            var self = this;
            var templatesPath = path.relative(this.rootDir,path.join(this.rootDir, 'views', 'templates', ''));
            var publicJSPath = path.relative(this.rootDir,path.join(__dirname, '..', 'public', 'javascripts', 'templates.js'));
            var cmd = "clientjade "+templatesPath+" > "+publicJSPath;
            exec(cmd, function (error, stdout, stderr) {
                if(!error){
                    console.log('Jade templates compiled into JS');
                    var files = [];
                    require("fs").readdirSync(path.join(__dirname, '..', 'public', 'javascripts')).forEach(function(file) {
                        files.push(path.join(__dirname, '..', 'public', 'javascripts', file));
                    });
                    require("fs").readdirSync(path.join(self.rootDir, 'public', 'javascripts')).forEach(function(file) {
                        if(file != 'application.js'){
                            files.push(path.join(self.rootDir, 'public', 'javascripts', file));
                        }
                    });
                    var result = UglifyJS.minify(files);
                    fs.writeFile(path.join(self.rootDir, 'public', 'javascripts', 'application.js'), result.code, function(err) {
                        if(err) {
                            console.log(err);
                        } else {
                            console.log('Created minified application.js');
                        }
                    });
                }else{
                    console.log(error, stdout, stderr);
                }
            });
        }
    }

});