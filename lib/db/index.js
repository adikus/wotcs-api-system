var Eventer = require('../base/eventer');
var _ = require('underscore');

module.exports = Eventer.extend({

    init: function(databases, callback) {
        var self = this;

        this.ready = false;
        this.databases = {};
        _.each(databases, function(database, name){
            var DB = require('./db_'+database.type.toLowerCase());
            this.databases[name] = new DB(database.url, function(err) {
                if(err){
                    console.log('Error connecting to %s',name);
                }else{
                    console.log('Connected to %s',name);
                    emitConnected();
                }
            });
        },this);
        var emitConnected = _.after(_.size(this.databases), function(){
            self.ready = true;
            self.emit('connected');
        });
    }

});