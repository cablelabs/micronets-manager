var _ = require('lodash')
var axios = require('axios')
var Micronets = require('../models/micronet')
var utils = require('../utils')
var config = require('../../config/default.json')
var cors = require('cors')
var NRP = require('node-redis-pubsub')

const {redis , odl , channels} = config;
const { host, port , initializeUrl } = odl;
const { publish , subscribe } = channels;
const nrp = new NRP(redis)

module.exports = (app) => {

  app.get('/initialize/:subnets/:hosts', cors(), (req, res, next) => {

    const initialize = axios({
      method: 'get',
      url: `${host}:${port}/${initializeUrl}/${req.params.subnets}/${req.params.hosts}`
    })
      .then(function (response) {
        return response.data.statusCode == 0 ? true : false
      })

    if (initialize) {
      nrp.on( subscribe, function (data, channel) {
         console.log('\n\n DATA : ' + JSON.stringify(data) + '\n\n CHANNEL : ' + JSON.stringify(channel))
        if (data && data.statusCode == '0') {
          Micronets.findOne({statusCode: '0'})
            .exec((err, obj) => {
              if (err) {
                return res.json({err, statusCode: 500})
              }

              // Update the existing micro-net present.
              else {
                if (obj) {
                  _.merge(obj, data)
                  obj.save((err, obj) => {
                    if (err) {
                      return res.json({err, statusCode: 500})
                    }
                    else {
                      res.json({obj, statusCode: 200})
                    }
                  })
                }
                // No micro-net present create one.
                else if (obj == null) {
                  var newMicronet = new Micronets(data)
                  newMicronet.save((err, micronet) => {
                    if (err) {
                      console.log('\n Error while creating micronet : ' + JSON.stringify(err))
                      return res.json({err, statusCode: 500})
                    }
                    else {
                      res.json({items:micronet, statusCode: 200})
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
        return res.json({statusCode: 500, error: err})
      }
      res.json({statusCode: 201, data: micronet})
    })
  })

  app.put('/micronets/:id', cors(), (req, res, next) => {
    const url = 'http://127.0.0.1:18080/odl/mdl/test/publish?subnets=1&hosts=2'

    // AXIOS MDL POST REQUEST : CORS ERROR
    // axios({
    //   method: 'post',
    //   url: url,
    //   crossDomain: true
    // }).then(function (err, response) {
    //   if (err) {
    //     console.log('\n error : ' + JSON.stringify(err))
    //   }
    //   console.log('\n axios response : ' + JSON.stringify(response))
    // })

    nrp.on( subscribe, function (data, channel) {
      console.log('\n\n DATA : ' + JSON.stringify(data) + '\n\n CHANNEL : ' + JSON.stringify(channel))
      if(data){
        Micronets.findById(req.params.id, (err, micronet) => {
          // Handle  database errors
          if (err) {
            return res.json({statusCode:500, error:err});
          }
          else {
            micronet.timestampUtc = data.timestampUtc
            micronet.statusCode = data.statusCode
            micronet.statusText = data.statusText
            micronet.logEvents = data.logEvents
            micronet.subnets =  data.subnets;
            // Save the updated document back to the database
            micronet.save((err, updatedMcronet) => {
              if (err) {
               return res.json({statusCode:500, error:err})
              }
              res.json({statusCode:200 , items:updatedMcronet})
            });
          }
        });
      }
    })

  })

  /* Read */

  app.get('/micronets', cors(), (req, res, next) => {
    Micronets.find((err, micronets) => {
      if (err) {
        return res.json({statusCode: 500, error: err})
      }
      res.json({statusCode: 200, items: micronets})
    })
  })

  app.get('/micronet/:id', cors(), (req, res, next) => {
    Micronets.findById(req.params.id, (err, micronets) => {
      if (err) {
        return res.json({statusCode: 500, error: err})
      }
      if (micronets) {
        return res.json({statusCode: 200, items: micronets})
      }
      else {
        res.json({statusCode: 200, items: []})
      }
    })
  })

}