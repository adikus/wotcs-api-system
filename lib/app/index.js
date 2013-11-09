var cluster = require('cluster');

module.exports = function (rootDir, config) {
    var App = cluster.isMaster ? require('./master_app.js') : require('./worker_app.js');
    return new App(rootDir, config);
}