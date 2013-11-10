var cls = require('./class');
var _ = require('underscore');

module.exports = cls.Class.extend({

    on: function() {
        var args = _.toArray(arguments);
        var callback = args.pop();
        var event = args.shift() || '*';
        var once = args.pop() || false;
        return this.registerCallback(event, callback, once);
    },

    once: function() {
        var args = _.toArray(arguments);
        args.splice(1,0,true);
        return this.on.apply(this, args);
    },

    executeOn: function(func, event) {
        var self = this;
        this.on(event, function() {
            self[func].apply(self, arguments);
        });
    },

    executeNowOrOnce: function(condition, event, callback) {
        if(condition){
            callback();
        }else{
            this.once(event, callback);
        }
    },

    registerCallbackRecursive: function(events, callback, once, obj) {
        var event = events.shift();
        if(events.length > 0){
            if(!obj[event]){
                obj[event] = {};
            }
            return this.registerCallbackRecursive(events, callback, once, obj[event]);
        }else{
            if(!obj[event]){
                obj[event] = {on:[], once:[]};
            }
            if(!this.counter){
                this.counter = 0;
            }
            obj[event][once?'once':'on'].push({callback: callback, ID: this.counter});
            return this.counter++;
        }
    },

    registerCallback: function (event, callback, once) {
        var events = event.split('.');
        if(_.last(events) != '*'){
            events.push('*');
        }
        if(!this.callbacks){
            this.callbacks = {};
        }
        return this.registerCallbackRecursive(events, callback, once, this.callbacks);
    },

    unsetCallback: function(event, ID){
        var events = event.split('.');
        if(_.last(events) != '*'){
            events.push('*');
        }
        var obj = this.callbacks;
        _.each(events, function(e){
            obj = obj[e];
        });
        obj.on = _.reject(obj.on, function(callback) {
            return callback.ID == ID;
        });
    },

    propagateEvents: function() {
        var self = this;
        var args = _.toArray(arguments);
        var obj = this;
        var baseEvent = '';
        _.each(args, function(key) {
            obj = obj[key];
            baseEvent += key + '.';
        });

        obj.on(function() {
            var args = _.toArray(arguments);
            var event = args.shift();
            args.unshift(baseEvent+event);
            self.emit.apply(self, args);
        });
    },

    emit: function() {
        var args = _.toArray(arguments);
        var event = args[0];
        this.executeCallbacks(event, args);
    },

    executeCallbacksRecursive: function(events, obj) {
        if(!obj){
            return [];
        }
        var event = events.shift();
        var callbacks = [];
        if(obj['*']){
            callbacks = _.union(obj['*'].on, obj['*'].once);
            obj['*'].once.length = 0;
            if(_.size(obj['*'].on) == 0){
                delete obj['*'];
            }
        }
        if(event){
            var callbacks = _.union(callbacks, this.executeCallbacksRecursive(events, obj[event]));
            if(this.getCallbackCount(obj[event]) == 0){
                delete obj[event];
            }
            return callbacks;
        }else{
            return callbacks;
        }

    },

    waitingFor: function(event) {
        var events = event.split('.');
        var obj = this.callbacks;
        _.each(events, function(e){
            if(obj){
                obj = obj[e];
            }
        });
        return obj && obj['*'] && obj['*'].once;
    },

    executeCallbacks: function(event, args) {
        var callbacks = this.executeCallbacksRecursive(event.split('.'), this.callbacks);

        _.each(callbacks, function(func) {
            func.callback.apply(this, args);
        }, this);
    },

    getSize: function(obj) {
        var sum = 0;
        if(!obj){
            return sum;
        }
        if(typeof obj == 'object'){
            for(var i in obj){
                sum += i.toString().length;
                sum += this.getSize(obj[i]);
            }
        }else if(typeof obj == 'array'){
            for(var j in obj){
                sum += j.toString().length;
                sum += this.getSize(obj[j]);
            }
        }else{
            sum += obj.toString().length;
        }
        return sum;
    },

    getCallbackCount: function(obj) {
        var sum = 0;
        if(!obj){
            return sum;
        }
        if(typeof obj == 'object'){
            for(var i in obj){
                sum += this.getCallbackCount(obj[i]);
            }
        }else if(typeof obj == 'array'){
            for(var j in obj){
                sum += this.getCallbackCount(obj[j]);
            }
        }else{
            sum += 1;
        }
        return sum;
    }

});