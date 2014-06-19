module.exports = {
    App: require('./app/'),
    BaseModel: function(type) {
        return require('./models/base_model_'+type);
    },
    BaseCollection: function(type) {
        return require('./models/base_collection_'+type);
    },
    BaseController: require('./controllers/base_controller'),
    WorkerApp: require('./app/worker_app'),
    Eventer: require('./base/eventer'),
    Worker: require('./app/worker')
}
