/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
// Inspired by base2 and Prototype
var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;

// The base Class implementation (does nothing)
Class = function() {};

// Create a new Class that inherits from this class
Class.extend = function(prop) {
    var _super = this.prototype;

    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var prototype = new this();
    initializing = false;

    // Copy the properties over onto the new prototype
    for (var name in prop) {
        // Check if we're overwriting an existing function
        prototype[name] = typeof prop[name] == "function" &&
            typeof _super[name] == "function" && fnTest.test(prop[name]) ?
            (function(name, fn){
                return function() {
                    var tmp = this._super;

                    // Add a new ._super() method that is the same method
                    // but on the super-class
                    this._super = _super[name];

                    // The method only need to be bound temporarily, so we
                    // remove it when we're done executing
                    var ret = fn.apply(this, arguments);
                    this._super = tmp;

                    return ret;
                };
            })(name, prop[name]) :
            prop[name];
    }

    // The dummy class constructor
    Class = function () {
        // All construction is actually done in the init method
        if ( !initializing && this.init )
            this.init.apply(this, arguments);
    };

    // Populate our constructed prototype object
    Class.prototype = prototype;

    // Enforce the constructor to be what we expect
    Class.constructor = Class;

    // And make this class extendable
    Class.extend = arguments.callee;

    return Class;
};

if(!(typeof exports === 'undefined')) {
    exports.Class = Class;
}

WOTcsSystem = Class.extend({

    init: function(subscriptions) {
        if (!window.location.origin) {
            this.url = "ws://" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
        }else{
            this.url = location.origin.replace(/^http/, 'ws');
        }
        this.subscriptions = subscriptions;
        this.sync = {};
        this.callbacks = {};
        this.regexes = {};
        this.connect();
    },

    connect: function() {
        var self = this;
        var ws = new WebSocket(this.url);
        ws.onopen = function(){
            console.log('Connected');
            self.ws = ws;
            var msg = self.subscriptions;
            msg.unshift('subscribe');
            self.send(msg);
            self.sync.start = new Date();
        };
        ws.onmessage = function(event) {
            var msg = JSON.parse(event.data);
            for(var i = 0; i < msg.length; i++){
                self.handleMessage(msg[i]);
            }
        };
        ws.onclose = function() {
            if(self.close_calback){
                self.close_calback();
            }
            console.log('Reconnect in 1s');
            setTimeout(function(){
                self.connect();
            },1000);
        };
        this.onMessage('sync', function(data) {
            this.sync.end = new Date();
            this.sync.duration = this.sync.end.getTime() - this.sync.start.getTime();
            this.sync.midpoint = new Date((this.sync.end.getTime() + this.sync.start.getTime())/2);
            this.sync.server = new Date(data);
            this.sync.offset = this.sync.server.getTime() - this.sync.midpoint.getTime();
        });
    },

    send: function(msg){
        if(!this.ws){
            console.log('Not connected');
        }else{
            this.ws.send(JSON.stringify(msg));
        }
    },

    onMessage: function(event, callback) {
        if(typeof event == 'string'){
            if(!this.callbacks[event]){
                this.callbacks[event] = [];
            }
            this.callbacks[event].push(callback);
        }else{
            var s = event.toString();
            if(!this.regexes[s]){
                this.regexes[s] = {regex: event, callbacks: []};
            }
            this.regexes[s].callbacks.push(callback);
        }
    },

    handleMessage: function(msg) {
        var event = msg.shift();
        var i;
        if(this.callbacks[event]){
            for(i in this.callbacks[event]){
                this.callbacks[event][i].apply(this, msg);
            }
        }

        for(var j in this.regexes){
            var regex = this.regexes[j].regex;
            var match = event.match(regex);
            if(match){
                for(i in this.regexes[j].callbacks){
                    var args = [match, arguments[0][0]];
                    this.regexes[j].callbacks[i].apply(this, args);
                }
            }
        }
    },

    onClose: function(callback){
        this.close_calback = callback;
    }

});