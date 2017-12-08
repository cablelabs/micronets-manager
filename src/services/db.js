const mongoose = require('mongoose')

module.exports = function connectToDb (config) {
  return new Promise((resolve, reject) => {
    mongoose.connect(config)
    const db = mongoose.connection
    db.on('error', reject)
    db.once('open', resolve)
  })
}
