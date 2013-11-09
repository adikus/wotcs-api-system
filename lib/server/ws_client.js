var cls = require('../base/class');
var _ = require('underscore');

module.exports = cls.Class.extend({

    init: function(ws, role) {
        var self = this;
        this.ws = ws;
        this.buffer = [];
        this.role = role || '*';
        setInterval(function(){
            self.step();
        },250);
    },

    send: function(msg) {
        this.buffer.push(msg);
    },

    step: function() {
        var msg = '[';
        if(this.buffer.length > 0){
            msg += this.buffer.join(', ') + ']';
            this.ws.send(msg, function(err) {
                if(err){
                    console.log(err);
                }
            });
            this.buffer = [];
        }
    }

});