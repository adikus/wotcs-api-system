module.exports = {
    App: require('./app/'),
    BaseModel: function(type) {
        return require('./models/base_model_'+type.toLowerCase());
    },
    BaseCollection: function(type) {
        return require('./models/base_collection_'+type.toLowerCase());
    },
    BaseController: require('./controllers/base_controller'),
    WorkerApp: require('./app/worker_app'),
    Eventer: require('./base/eventer')
}