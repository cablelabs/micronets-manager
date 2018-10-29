var assert = require('assert')
var chai = require('chai')
var should = chai.should()
var app = require('../api/app')
const port = app.get('port');
var server
const dw = require('../api/hooks/dhcpWrapper')

describe.skip('Test DHCP Wrapper', function() {
  before(() => {})
  it('Verify Connection', (done) =>{
    let response1 = false;
    let response2 = false;
    dw.connect('wss://74.207.229.106:5050/micronets/v1/ws-proxy/micronets-gw-7B2A-BE88-08817Z', function(error, success) {
      console.log(success)
      if (error) done(error)
      else {
        dw.request({}, function(error, response){
          if (error) done(error)
          else {
            console.log(response)
            response.message.inResponseTo.should.equal(2)
            if (response2) done()
            else response1 = true;
          }
        })
        dw.request({}, function(error, response){
          if (error) done(error)
          else {
            console.log(response)
            response.message.inResponseTo.should.equal(3)
            if (response1) done()
            else response2 = true;
          }
        })
      }
    })
  })
})