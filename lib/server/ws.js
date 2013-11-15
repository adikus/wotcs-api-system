var cls = require('../base/class');
var WebSocketServer = require('ws').Server;
var _ = require('underscore');
var WSClient = require('./ws_client');
var express = require('express');

module.exports = cls.Class.extend({

    init: function(server, workerManager, config) {
        this.server = server;
        this.workerManager = workerManager;
        this.config = config;
        this.cookieParser = express.cookieParser(this.server.config.cookieSecret);
        this.wss = new WebSocketServer({server: this.server.server});
        console.log('Websocket server created');

        this.subscriptions = {};
        this.clientCounter = 0;
        this.clients = {};

        var self = this;
        this.wss.on('connection', function(ws) {
            self.cookieParser(ws.upgradeReq, null, function() {
                self.handleConnection(ws, ws.upgradeReq.signedCookies);
            });
        });
    },

    handleConnection: function(ws, cookies){
        var ID = this.clientCounter++;
        this.clients[ID] = new WSClient(ws, cookies.role);
        var self = this;
        ws.on('message', function(data) {
            var msg = JSON.parse(data);
            var action = msg.shift();
            if(action == 'subscribe'){
                ws.send(JSON.stringify([['sync', new Date()]]));
                _.each(msg, function(event) {
                    self.addSubscriber(event, ID);
                });
            }else if(action == 'execute'){
                var worker = msg.shift();
                var method = msg.shift();
                if(self.clientCan(method, ID) && self.workerManager.workers[worker]){
                    msg.unshift(method);
                    msg.push(function(){
                        var args = _.toArray(arguments);
                        if(args[0] !== undefined){
                            args.unshift('execute.'+worker+'.'+method);
                            var msg = JSON.stringify(args);
                            self.clients[ID].send(msg);
                        }
                    });
                    self.workerManager.workers[worker].execute.apply(self.workerManager.workers[worker], msg);
                }
            }else if(action == 'execute-all'){
                var method = msg.shift();
                if(self.clientCan(method, ID)){
                    msg.unshift(method);
                    var ret = {};
                    var send = _.after(_(self.workerManager.workers).size(),function(){
                        if(self.clients[ID]){
                            var msg = JSON.stringify(['execute-all.'+method, ret]);
                            self.clients[ID].send(msg);
                        }
                    });
                    self.workerManager.forAll(function(worker, workerID){
                        var finalMsg = msg;
                        finalMsg.push(function(){
                            ret[workerID] = {args: arguments, type: worker.type != 'cluster' ? worker.type : 'local'};
                            send();
                        });
                        worker.execute.apply(worker, msg);
                    });
                }
            }else if(action == 'server-worker'){
                console.log('Server worker connected');
                self.workerManager.addServerWorker(ws, msg.shift());
            }else if(action == 'client-worker'){
                console.log('Client worker connected');
                self.workerManager.addClientWorker(ws, msg.shift());
            }
        });
        ws.on('close', function() {
            delete self.clients[ID];
            self.unsubscribe(ID);
        });
    },

    clientCan: function(method, ID) {
        var roles = this.config.execute.permissions[method] || [];
        roles = _.union(this.config.execute.permissions['*'], roles);
        var role = this.clients[ID].role;
        return _.include(roles, role);
    },

    addSubscriber: function(event, ID) {
        var self = this;
        if(!this.subscriptions[event]){
            var callbackID = this.workerManager.on(event, function() {
                self.sendToSubscribers(event,arguments);
            });
            this.subscriptions[event] = {ID: callbackID, clients: []};
        }
        this.subscriptions[event].clients.push(ID);
    },

    unsubscribe: function(ID) {
        _.each(this.subscriptions, function(subscription) {
            subscription.clients = _.reject(subscription.clients, function(cID) {
                return cID == ID;
            });
        });
    },

    sendToSubscribers: function(event, args) {
        var self = this;
        args = _.toArray(args);
        if(args.pop() === true){
            var msg = JSON.stringify(args);

            _.each(this.subscriptions[event].clients, function(ID) {
                var ws = self.clients[ID];
                ws.send(msg);
            });
        }
    }

});