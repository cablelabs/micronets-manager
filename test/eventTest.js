var assert = require('assert')
var chai = require('chai')
var should = chai.should()
var app = require('../api/app')
const port = app.get('port');
var server
const dw = require('../api/hooks/dhcpWrapperPromise')



describe('Test DHCP Wrapper Event', function () {
  it('Test Event', (done) => {
    dw.eventEmitter.on('Test', (message) => {
      console.log('Event Fired')
      console.log(message)
      done()
    })
    dw.event()
  });

});