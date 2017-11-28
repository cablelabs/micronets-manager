var _ = require('lodash');
var axios = require('axios');
var Micronets = require('../models/micronet');
var utils = require('../utils');
var redisConfig = require('../../config/default.json').redis
var NRP = require('node-redis-pubsub');
var nrp = new NRP(redisConfig);

module.exports = (app) => {

  app.get('/initialize/:subnets/:hosts', (req, res , next) => {

    const initialize =  axios({ method:'get', url:`http://127.0.0.1:18080/odl/mdl/test/publish/${req.params.subnets}/${req.params.hosts}`})
      .then(function(response) {
        console.log('\n AXIOS RESPONSE  : ' + JSON.stringify(response.data))
        return response.data.statusCode == 0 ? true : false
      });

    console.log('\n services micro-nets initialize value : '+ JSON.stringify(initialize));

    if(initialize){
      console.log('\n INITIALIZING REDIS PUBSUB ....')
      console.log('\n REDIS CONFIG :' + JSON.stringify(redisConfig))
      nrp.on('MM:MDL_1.0.0', function (data, channel) {
        console.log('\n\n DATA : ' + JSON.stringify(data) +'\n\n CHANNEL : '+ JSON.stringify(channel));
        if ( data && data.statusCode == '0') {
          console.log('\n Micro-net created successfully');
          Micronets.findOne({statusCode: '0'})
            .exec((err,obj) => {
              if(err){
                res.json({err, statusCode:500})
              }

              // Update the existing micro-net present.
              else {
                console.log('\n Existing Micro-net object : ' + JSON.stringify(obj));
                if (obj) {
                  console.log('\n EXISTING MICRO-NET : ' + JSON.stringify(obj));
                  console.log('\n NEW MICRONET DATA : ' + JSON.stringify(data));
                  _.merge(obj, data);
                  obj.save((err, obj) => {
                    if (err) {
                      console.log('\n ERROR WHILE UPDATE : ' + JSON.stringify(err))
                      res.json({err, statusCode: 500})
                    }
                    else {
                      console.log('\n UPDATED MICRO-NET : ' + JSON.stringify(obj))
                      res.json({obj, statusCode: 200});
                    }
                  });
                }
                // No micro-net present create one.
                else if (obj == null) {
                  console.log('\n No micro-net present creating a new one');
                  var newMicronet = new Micronets(data);
                  newMicronet.save((err, micronet) => {
                    if (err) {
                      console.log('\n Error while creating micronet : ' + JSON.stringify(err))
                      res.json({err, statusCode: 500})
                    }
                    else {
                      res.json({micronet, statusCode: 200});
                    }

                  });
                }
              }
            });
        }
      });
    }
  })



  /* Create */
  app.post('/micronet' , (req,res) => {

    var newMicronet = new Micronets(req.body);
    newMicronet.save((err,micronet) => {
      if(err){
        res.json({statusCode:500,error:err});
      }
      res.json({statusCode:201,data:micronet});
    });
    console.log('\n Micronet created successfully')
  });

  /* Update */
  app.put('/micronet' , (req,res) => {
    var newMicronet = new Micronets(req.body);
    newMicronet.save((err) => {
      if(err){
        res.json({info:'error occured during micro-net creation' , error:err});
      }
      res.json({info:'Micronet created successfully'});
    });
    console.log('\n Micronet created successfully')
  });

  app.put('/micronet/:id' , (req,res) =>{
    Micronets.findById(req.params.id, (err, micronets) => {
      if(err) {
        res.json({info:'err during find micronet',error:err});
      }
      if(micronets){
        _.merge(micronets , req.body);
        micronets.save((err) => {
          if(err){
            res.json({info:'err during updating micronet',error:err});
          }
          res.json({info :'micronet updated succesfully'});
        });
      }
      else{
        res.json({info:'micronet not found'})
      }
    })
  })

  /* Read */

  app.get('/micronets' , (req,res) => {

    console.log('\n inside get micronets')

    // nrp.on('MM:MDL_1.0.0',function(data){
    //   console.log('\n\n\n MM:MDL_1.0.0 Data' + JSON.stringify(data));
    //   res.json(data)
    // });

    Micronets.find((err, micronets) => {
      if(err) {
        res.json({statusCode:500,error:err});
      }
      res.json({statusCode:200,items:micronets})

    })
    console.log('\n Micronet read successfully')
  });


  app.get('/micronet/:id' , (req,res) => {
    Micronets.findById(req.params.id, (err, micronets) => {
      if(err) {
        res.json({info:'err during find micronet',error:err});
      }
      if(micronets){
        res.json({info:'micronet found successfully',data:micronets})
      }
      else{
        res.json({info:'micronet not found'})
      }
    })
    console.log('\n Micronet read successfully')
  });




}