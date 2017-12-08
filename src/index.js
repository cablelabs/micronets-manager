const path = require('path')
const express = require('express')
const compress = require('compression')
const cors = require('cors')
const helmet = require('helmet')
const favicon = require('serve-favicon')
const bodyParser = require('body-parser')
const logger = require('morgan')
const NRP = require('node-redis-pubsub')
const connectToDb = require('./services/db')
// const methodOverride = require('method-override')

const ENV = process.env.NODE_ENV === 'production' ? 'prod' : 'dev'
const config = require('../config/default.json')[ENV]

// CONNECT
const messenger = new NRP(config.redis)
const publish = data => messenger.emit(config.channels.publish, data)
const subscribe = cb => messenger.on(config.channels.subscribe, cb)
const context = { config, publish, subscribe }
const store = require('./store')(context)

return Promise.all([
  connectToDb(config.mongodb),
  store.dispatch('initialize')
])
.then(connectionHandler, console.error)

function connectionHandler () {
  const app = express()

  // Enable CORS, security, compression, favicon and body parsing
  app.use(cors())
  app.use(logger('dev'))
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(helmet())
  app.use(compress())

  // Handles put requests
  // app.use(methodOverride());

  function handleRequest (actionName) {
    return (req, res) => store.dispatch(actionName, { body: req.body, params: req.params }).then(
      result => { res.status(result.statusCode || 200).json(result.data) },
      error => { res.status(error.statusCode || 500).json({ error }) }
    )
  }

  app.post('/micronets', handleRequest('upsertMicronet'))
  app.put('/micronets/:id', handleRequest('upsertMicronet'))
  app.get('/micronets', handleRequest('queryMicronets'))
  app.get('/micronets/:id', handleRequest('getMicronetById'))
  app.post('create-mock-micronet', handleRequest('createMockMicronet'))

  app.get('/', cors(), function (req, res) {
    res.json({ message: 'Express server is running ' })
  })

  const server = app.listen(config.port, () => {
    console.log('\n Server running at port ' + config.port)
  })
}
