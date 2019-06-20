var assert = require('assert')
var chai = require('chai')
var should = chai.should()
var sa
var newSubnet = {}
var app = require('../api/app')
const port = app.get('port');
var server

describe('Test Subnet Allocation', function() {
  let subnet = null
  before(function(done) {
    app.get('subnet')
      .then((subnetObj) => {
        sa = subnetObj
        sa.db.removeMany({}, function(err, res) {
          if (err) {
            console.log(err);
            done(err)
          }
          else {
            done()
          }
        })
      })
      .catch(err => {
        done(err)
      })
  })

  it('Get Subnet Object', (done) => {
    sa.allocateSubnetAddress({octetA: 192, octetB: 168, octetC: {min:100, max:254}},
                                 {octetD: 1})
      .then((sn) => {
        newSubnet = sn
        newSubnet.subnetAddress.should.equal("192.168.100.0/24")
        newSubnet.gatewayAddress.should.equal('192.168.100.1')
      }).then(done, done)
  })

  it('Get Array of Subnet Objects', (done) => {
    let promiseList = []
    for (let i = 0;i < 10; i ++) {
      promiseList.push(sa.allocateSubnetAddress({octetA: 192, octetB: 168, octetC: {min:100, max:254}},
                                                    {octetD: 1}))
    }
    Promise.all(promiseList)
      .then((snArray) => {
        snArray.length.should.equal(10)
        for (let subnet = 0; subnet < 10; subnet++) {
          console.log("Found subnet #" + subnet + ": " + JSON.stringify(snArray[subnet]))
          snArray[subnet].subnetAddress.should.equal("192.168."+(101+subnet)+".0/24")
        }
      }).then(done, done)
  })

  it('Allocate Two Host Objects', (done) => {
    let devices = [
      {
        deviceMac: "b8:27:eb:df:ae:a7",
        deviceId: "pib",
        modelName: "Raspberry-Pi3-Model-B-v1.2"
      },
      {
        deviceMac: "b8:27:eb:df:ae:a8",
        deviceId: "pib2",
        modelName: "Raspberry-Pi3-Model-B-v1.2"
      }
    ]
    let promiseList = []
    for (let i = 0;i < devices.length; i++) {
      deviceObj = devices[i]
      promiseList.push(sa.allocateDeviceAddress(newSubnet.subnetAddress,
                                                    {octetD: {min:10, max:20}},
                                                    deviceObj))
    }
    Promise.all(promiseList).then((snArray) => {
      console.log("Completed allocation of " + snArray.length + " device addresses")
      snArray.length.should.equal(devices.length)
      subnet = snArray[devices.length-1]
      subnet.subnetAddress.should.equal('192.168.100.0/24')
      subnet.gatewayAddress.should.equal('192.168.100.1')
      subnet.devices.length.should.equal(devices.length)
      // Note: This assumes the Promises are executed in-order
      subnet.devices[0].deviceMac.should.equal(devices[0].deviceMac)
      subnet.devices[0].deviceId.should.equal(devices[0].deviceId)
      subnet.devices[0].deviceAddress.should.equal('192.168.100.10')

      subnet.devices[1].deviceMac.should.equal(devices[1].deviceMac)
      subnet.devices[1].deviceId.should.equal(devices[1].deviceId)
      subnet.devices[1].deviceAddress.should.equal('192.168.100.11')
    }).then(done, done)
  })

  it('Get Second Subnet Object', (done) => {
    console.log("Getting second subnet...")
    console.log("subnet: " + JSON.stringify(subnet))
    sa.allocateSubnetAddress(Object.assign({},{octetA: 192, octetB: 168, octetC: {min:100, max:254}}),
                                 Object.assign({},{octetD: 1}))
      .then((sn) => {
        console.log("Allocated second subnet " + JSON.stringify(sn))
        newSubnet = sn
        newSubnet.subnetAddress.should.equal("192.168.111.0/24")
        newSubnet.gatewayAddress.should.equal('192.168.111.1')
      }).then(done, done)
  })

  it('Get Two More Host Objects', (done) => {
    console.log("Getting 2 more host objects from " + JSON.stringify(newSubnet))
    let devices = [
      {
        deviceMac: "b8:27:eb:df:ae:a9",
        deviceId: "pib",
        modelName: "Raspberry-Pi3-Model-B-v1.2"
      },
      {
        deviceMac: "b8:27:eb:df:ae:aa",
        deviceId: "pib2",
        modelName: "Raspberry-Pi3-Model-B-v1.2"
      }
    ]
    let promiseList = []
    for (let i = 0;i < devices.length; i ++) {
      deviceObj = devices[i]
      promiseList.push(sa.allocateDeviceAddress(newSubnet.subnetAddress,
                                                    {octetD: {min:10, max:11}},
                                                    deviceObj))
    }
    Promise.all(promiseList).then((snArray) => {
      snArray.length.should.equal(devices.length)
      subnet = snArray[devices.length-1]
      subnet.subnetAddress.should.equal('192.168.111.0/24')
      subnet.gatewayAddress.should.equal('192.168.111.1')
      subnet.devices.length.should.equal(devices.length)
      // Note: This assumes the Promises are executed in-order
      subnet.devices[0].deviceMac.should.equal(devices[0].deviceMac)
      subnet.devices[0].deviceId.should.equal(devices[0].deviceId)
      subnet.devices[0].deviceAddress.should.equal('192.168.111.10')

      subnet.devices[1].deviceMac.should.equal(devices[1].deviceMac)
      subnet.devices[1].deviceId.should.equal(devices[1].deviceId)
      subnet.devices[1].deviceAddress.should.equal('192.168.111.11')
    }).then(done, done)
  })

  it('Fail to allocate device address after device addresses exhausted', (done) => {
    console.log("subnet: " + JSON.stringify(subnet))
    device = {
        deviceMac: "b8:27:eb:df:ae:ab",
        deviceId: "pib2",
        modelName: "Raspberry-Pi3-Model-B-v1.2"
    }
    console.log("subnet: " + JSON.stringify(subnet))
    sa.allocateDeviceAddress(newSubnet.subnetAddress, {octetD: {min:10, max:11}}, device)
      .then((sn) => {
       done(new Error("Should not create a third ip address"))
      })
      .catch((err) =>{
        done();
      })
  })

  it('Get an allocated Subnet', (done) => {
    console.log("subnet: " + JSON.stringify(subnet))
    sa.getSubnet("192.168.101.0/24")
      .then((sn) => {
        subnet = sn
        subnet.subnetAddress.should.equal('192.168.101.0/24')
        subnet.gatewayAddress.should.equal('192.168.101.1')
      }).then(done, done)
  })

  it('Remove a Allocated Subnet', (done) => {
    sa.releaseSubnetAddress("192.168.100.0/24")
      .then(() => {

      }).then(done, done)
  })

  it('Try To Get a Removed Subnet Object', (done) => {
    sa.getSubnet("192.168.100.0/24")
      .then((sn) => {
        done(new('Should not be able to retrieve a removed subnet'))
      })
      .catch(()=> {
        done()
      })
  })
})