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
            if(self.errorCollectionName){
                self.models.errorCollection = self.models[self.errorCollectionName];
                self.setupErrorHandler();
            }
            self.distributeModels();
            self.queue.fillQueue();

            if(self.dev){
                var watcher = chokidar.watch(path.join(this.rootDir, 'models'));
                watcher.on('change', function(path) {
                    console.log('Models reloaded');
                    delete require.cache[require.resolve('../models')];
                    self.models = require('../models')(self, true);
                    if(self.errorCollectionName){
                        self.models.errorCollection = self.models[self.errorCollectionName];
                    }
                    self.distributeModels();
                });
            }
        });
        this.router = new Router(require('../controllers')(this.rootDir), this.rootDir, this.config.assets);
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

    setupWorkers: function(count, file, clientFile, queue){
        this.queue = queue;
        this.workerManager = new WorkerManager(queue, this.rootDir, clientFile, this.config.workerManager);
        this.router.workerManager = this.workerManager;
        for(var i = 0; i < count; i++){
            this.workerManager.addWorker(file);
        }
    },

    setErrorHandler: function(collectionName){
        this.errorCollectionName = collectionName;
    },

    setupErrorHandler: function() {
        var self = this;
        process.on('uncaughtException',function(E){
            var e = self.errorCollection.new({e:E.stack,t:new Date(),'a':'clans'});
            e.save(['a','e','t'],function(){
                console.log(E.stack);
                process.exit(1);
            });
        });
        this.router.routes['get /errors'] = { method: 'get', controller: 'system', action: 'errors'};
    },

    compileJS: function() {
        console.log('Precompiling JADE templates to JS');
        var self = this;
        var templatesPath = path.relative(this.rootDir,path.join(this.rootDir, 'views', 'templates', ''));
        var publicJSPath = path.relative(this.rootDir,path.join(__dirname, '..', 'public', 'javascripts', 'templates.js'));
        var clientjadePath = path.relative(this.rootDir,path.join(__dirname, '..', '..', 'node_modules', '.bin', 'clientjade'));
        var cmd = clientjadePath+" "+templatesPath+" > "+publicJSPath;
        exec(cmd, function (error, stdout, stderr) {
            if(!error){
                console.log('Jade templates compiled into JS');
                var files = self.getFilesToInclude();
                if(!self.dev || self.config.assets.compileInDev){
                    var result = UglifyJS.minify(files);
                    var timestamp = (new Date()).getTime();
                    fs.writeFile(path.join(self.rootDir, 'public', 'javascripts', 'application-'+timestamp+'.js'), result.code, function(err) {
                        if(err) {
                            console.log(err);
                        } else {
                            console.log('Created minified application.js');
                            self.router.setIncludedJS(['application-'+timestamp+'.js']);
                        }
                    });
                }else{
                    self.router.setIncludedJS(files);
                }
            }else{
                console.log(error, stdout, stderr);
            }
        });
    },

    getFilesToInclude: function() {
        var baseJSPath = path.join(__dirname, '..', 'public', 'javascripts');
        var files = [
            path.join(baseJSPath,'underscore.js'),
            path.join(baseJSPath,'class.js'),
            path.join(baseJSPath,'eventer.js'),
            path.join(baseJSPath,'system.js'),
            path.join(baseJSPath,'templates.js')
        ];
        var clientJSPath = path.join(this.rootDir, 'public', 'javascripts');
        _(this.config.assets.include).each(function(file){
            files.push(path.join(clientJSPath,file));
        });
        return files;
    }

});