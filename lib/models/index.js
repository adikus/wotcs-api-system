var _ = require('underscore');
var path = require('path');

module.exports = function( app, force ) {
    var ret = {};
    var models = {};

    require("fs").readdirSync(path.join(app.rootDir, 'models')).forEach(function(file) {
        var parts = file.split('.')[0].split('_');
        var name = _.map(parts,function (part) {
            return part.charAt(0).toUpperCase() + part.slice(1);
        }).join('');
        if(force){
            delete require.cache[require.resolve(path.join(app.rootDir, 'models', file))];
        }
        models[name] = require(path.join(app.rootDir, 'models', file));
    });

    _.each(models,function (model, name) {
        if(name.slice(-1) == 's'){
            var singularName = name.slice(0,-1);
            ret[name] = new model(app, models[singularName], singularName);
        }
    });

    return ret;
};