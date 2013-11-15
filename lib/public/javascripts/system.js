WOTcsSystem = Eventer.extend({

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
        console.log('Connecting');
        var self = this;
        var ws = new WebSocket(this.url);
        ws.onopen = function(){
            console.log('Connected');
            self.ws = ws;
            self.emit('connected');
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
            self.emit('closed');
            console.log('Reconnect in 1s');
            setTimeout(function(){
                self.connect();
            },1000);
        };
        this.on('sync', function(event, data) {
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

    handleMessage: function(msg) {
        this.emit.apply(this, msg);
    }

});