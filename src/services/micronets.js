var _ = require('lodash')
var axios = require('axios')
var Micronets = require('../models/micronet')
var utils = require('../utils')
var config = require('../../config/default.json')
var cors = require('cors')

const {redis , odl , channels} = config;

var NRP = require('node-redis-pubsub')
var nrp = new NRP(redis)

module.exports = (app) => {

  app.get('/initialize/:subnets/:hosts', cors(), (req, res, next) => {

    const { host, port , initializeUrl } = odl;
    const initialize = axios({
      method: 'get',
      url: `${host}:${port}/${initializeUrl}/${req.params.subnets}/${req.params.hosts}`
    })
      .then(function (response) {
        console.log('\n AXIOS RESPONSE  : ' + JSON.stringify(response.data))
        return response.data.statusCode == 0 ? true : false
      })

    console.log('\n services micro-nets initialize value : ' + JSON.stringify(initialize))

    if (initialize) {
      console.log('\n INITIALIZING REDIS PUBSUB ....')
      console.log('\n REDIS CONFIG :' + JSON.stringify(redisConfig))
      nrp.on('MM:MDL_1.0.0', function (data, channel) {
        console.log('\n\n DATA : ' + JSON.stringify(data) + '\n\n CHANNEL : ' + JSON.stringify(channel))
        if (data && data.statusCode == '0') {
          console.log('\n Micro-net created successfully')
          Micronets.findOne({statusCode: '0'})
            .exec((err, obj) => {
              if (err) {
                res.json({err, statusCode: 500})
              }

              // Update the existing micro-net present.
              else {
                console.log('\n Existing Micro-net object : ' + JSON.stringify(obj))
                if (obj) {
                  console.log('\n EXISTING MICRO-NET : ' + JSON.stringify(obj))
                  console.log('\n NEW MICRONET DATA : ' + JSON.stringify(data))
                  _.merge(obj, data)
                  obj.save((err, obj) => {
                    if (err) {
                      console.log('\n ERROR WHILE UPDATE : ' + JSON.stringify(err))
                      res.json({err, statusCode: 500})
                    }
                    else {
                      console.log('\n UPDATED MICRO-NET : ' + JSON.stringify(obj))
                      res.json({obj, statusCode: 200})
                    }
                  })
                }
                // No micro-net present create one.
                else if (obj == null) {
                  console.log('\n No micro-net present creating a new one')
                  var newMicronet = new Micronets(data)
                  newMicronet.save((err, micronet) => {
                    if (err) {
                      console.log('\n Error while creating micronet : ' + JSON.stringify(err))
                      res.json({err, statusCode: 500})
                    }
                    else {
                      res.json({micronet, statusCode: 200})
                    }

                  })
                }
              }
            })
        }
      })
    }
  })

  /* Create */

  app.post('/micronet', cors(), (req, res) => {

    var newMicronet = new Micronets(req.body)
    newMicronet.save((err, micronet) => {
      if (err) {
        res.json({statusCode: 500, error: err})
      }
      res.json({statusCode: 201, data: micronet})
    })
    console.log('\n Micronet created successfully')
  })

  app.post('/micronets/:id', cors(), (req, res, next) => {
    console.log('\n POST /micronet/:id REQ ')
    console.log('\n POST /micronet/:id REQ  : ' + JSON.stringify(req.params) + '\t\t\t REQ BODY : ' + JSON.stringify(req.body))
    console.log('\n DUMMY POST DATA : ' + JSON.stringify(dummyData))
    const url = 'http://127.0.0.1:18080/odl/mdl/test/publish?subnets=1&hosts=2'
    console.log('\n URL : ' + JSON.stringify(url))

    // AXIOS POST REQUEST
    // axios({
    //   method: 'post',
    //   url: url,
    //   crossDomain: true
    // }).then(function (err, response) {
    //   console.log('\n axios post response : ' + JSON.stringify(response))
    //   if (err) {
    //     console.log('\n error : ' + JSON.stringify(err))
    //   }
    //   console.log('\n old response : ' + JSON.stringify(response))
    // })

    nrp.on('MM:MDL_1.0.0', function (data, channel) {
      console.log('\n\n POST /micronets/:id  DATA: ' + JSON.stringify(data) + '\n\n CHANNEL : ' + JSON.stringify(channel))
      if(data){
        // MONGO DB DB PUT
        Micronets.findById(req.params.id, (err, micronet) => {
          // Handle any possible database errors
          if (err) {
            // res.status(500).send(err);
          } else {
            console.log('\n MONGO MICRONET FOUND ' + JSON.stringify(micronet))
            // Update each attribute with any possible attribute that may have been submitted in the body of the request
            // If that attribute isn't in the request body, default back to whatever it was before.
            micronet.timestampUtc = data.timestampUtc
            micronet.statusCode = data.statusCode
            micronet.statusText = data.statusText
            micronet.logEvents = data.logEvents
            micronet.subnets =  data.subnets;
            // Save the updated document back to the database
            micronet.save((err, updatedMcronet) => {
              if (err) {
                // res.status(500).send(err)
              }
              console.log('\n UPDATED MICRONET : ' + JSON.stringify(updatedMcronet))
              res.json({statusCode:200 , items:updatedMcronet})
            });
          }
        });
      }
    })

  })

  /* Read */

  app.get('/micronets', cors(), (req, res) => {
    Micronets.find((err, micronets) => {
      if (err) {
        res.json({statusCode: 500, error: err})
      }
      res.json({statusCode: 200, items: micronets})

    })
    console.log('\n Micronet read successfully')
  })

  app.get('/micronet/:id', cors(), (req, res) => {
    Micronets.findById(req.params.id, (err, micronets) => {
      if (err) {
        res.json({statusCode: 500, error: err})
      }
      if (micronets) {
        res.json({statusCode: 200, items: micronets})
      }
      else {
        res.json({statusCode: 404, items: []})
      }
    })
    console.log('\n Micronet read successfully')
  })

}