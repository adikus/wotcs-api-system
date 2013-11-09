var path = require('path');

module.exports = function(rootDir, force) {
    var controllers = {};

    require("fs").readdirSync(path.join(rootDir, 'controllers')).forEach(function(file) {
        var name= file.split('.')[0].split('_')[0];
        if(force){
            delete require.cache[require.resolve(path.join(rootDir, 'controllers', file))];
        }
        controllers[name] = require(path.join(rootDir, 'controllers', file));
    });

    return controllers;
};