const path = require('path');
const express= require('express')
const compress = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const favicon = require('serve-favicon');
const bodyParser = require('body-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const dbConfig = require('../config/default.json').mongodb
mongoose.connect('mongodb://localhost/micronets')
const app = express();
const micronets = require('./services/micronets')(app);
const port = 3000


// Enable CORS, security, compression, favicon and body parsing
// app.use(cors());
app.use(logger('dev'));
app.use(helmet());
app.use(compress());
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}))
// app.use(nrp)


app.get("/", function(req, res) {
  res.json({ message: "Express server is running " });
});
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

var server = app.listen(port,() => {
console.log('> Starting dev server...')
console.log('\n Server running at port '+ port)

})