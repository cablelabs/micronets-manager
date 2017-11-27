const http = require('http')
const path = require('path');
const express= require('express')
const compress = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const favicon = require('serve-favicon');
const bodyParser = require('body-parser');
const logger = require('winston');
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/micronets')

const app = express();
const micronets = require('./services/micronets')(app);

// Enable CORS, security, compression, favicon and body parsing
app.use(cors());
app.use(helmet());
app.use(compress());
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}))
//app.use(favicon(path.join(app.get('public'), 'favicon.ico')));



app.get('/' , ( req, res ) => {
res.send('Welcome to Micronets Manager!')
})

var server = app.listen(3000,() => {
console.log('> Starting dev server...')
console.log('\n Server running at http://127.0.0.1:3000/')
})