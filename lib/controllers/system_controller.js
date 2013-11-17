var BaseController = require('./base_controller');
var _ = require('underscore');

module.exports = BaseController.extend({

    errors: function(req, res){
        this.errorCollection.where({a: 'clans'},{order:{t:-1}},function(err, errors){
            res.json(_(errors).map(function(error){ return error.getData() }));
        });
    }

});