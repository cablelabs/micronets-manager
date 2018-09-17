var assert = require('assert')
var chai = require('chai')
var should = chai.should()
var app = require('../api/app')
const port = app.get('port');
var server
const dw = require('../api/hooks/dhcpWrapperPromise')

describe.only('Test DHCP Wrapper Promise', function () {
  describe('Positive Tests', function () {
    before((done) => {
      dw.connect('wss://localhost:5050/micronets/v1/ws-proxy/micronets-dhcp-0001')
        .then(() => {
          done()
        })
    })
    it('Verify Connection', (done) => {
      if (dw.isOpen()) {
        done()
      }
      else (done(new Error('Connection is not open')))
    });
    it('Post Subnet to DHCP', (done) => {
      let promiseList = []
      promiseList.push(dw.send({
        subnetId: 'mocksubnet001',
        ipv4Network: {
          network: '192.168.1.0',
          mask: '255.255.255.0',
          gateway: '192.168.1.1'
        },
        nameservers: ['1.2.3.4', '1.2.3.5']
      }, 'POST'))

      let expected = {
        body: {
          "subnet": {
            "subnetId": "mocksubnet001",
            "ipv4Network": {
              "network": "192.168.1.0",
              "mask": "255.255.255.0",
              "gateway": "192.168.1.1"
            },
            "nameservers": [
              "1.2.3.4",
              "1.2.3.5"
            ]
          }
        },
        status: 201
      };


      Promise.all(promiseList)
        .then(responses => {
          console.log(responses)
          responses.length.should.equal(1)
          let response3 = responses[0]
          response3.should.eql(expected)
          done()
        })
        .catch(err => {
          done(err)
        })
    });
    it('Post another Subnet to DHCP', (done) => {
      dw.connect('wss://localhost:5050/micronets/v1/ws-proxy/micronets-dhcp-0001')
        .then(() => {
          let promiseList = [];
          promiseList.push(dw.send({
            "subnetId": "mocksubnet002",
            "ipv4Network": {
              "network": "192.168.2.0",
              "mask": "255.255.255.0"
            }
          }, 'POST'));

          let expected = {
            body: {
              "subnet": {
                "subnetId": "mocksubnet002",
                "ipv4Network": {
                  "network": "192.168.2.0",
                  "mask": "255.255.255.0",
                }
              }
            },
            status: 201
          };

          Promise.all(promiseList)
            .then(responses => {
              console.log(responses)
              responses.length.should.equal(1)
              let response3 = responses[0]
              response3.should.eql(expected)
            }).then(done, done)

        })
        .catch(err => {
          done(err)
        })
    });
    it('Post multiple Subnets to DHCP', (done) => {
      dw.connect('wss://localhost:5050/micronets/v1/ws-proxy/micronets-dhcp-0001')
        .then(() => {
          let promiseList = [];
          promiseList.push(dw.send(
            {
              "subnetId": "mocksubnet008",
              "ipv4Network": {
                "network": "192.168.8.0",
                "mask": "255.255.255.0",
                "gateway": "192.168.8.1"
              },
              "nameservers": [
                "4.4.4.4",
                "8.8.8.8"
              ]
            }, 'POST'));

          promiseList.push(dw.send(
            {
              "subnetId": "mocksubnet009",
              "ipv4Network": {
                "network": "192.168.9.0",
                "mask": "255.255.255.0",
                "gateway": "192.168.9.1"
              }

            }, 'POST'));


          Promise.all(promiseList)
            .then(responses => {
              console.log(responses)
              responses.length.should.equal(2)
              responses[0].status.should.equal(201)
              responses[1].status.should.equal(201)

            }).then(done, done)

        })
        .catch(err => {
          done(err)
        })
    });
    it('GET Subnets', (done) => {
      dw.connect('wss://localhost:5050/micronets/v1/ws-proxy/micronets-dhcp-0001')
        .then(() => {
          let promiseList = []
          promiseList.push(dw.send({}, 'GET'));

          let expected = {
            body: {
              subnets: [
                {
                  "subnetId": "mocksubnet001",
                  "ipv4Network": {
                    "network": "192.168.1.0",
                    "mask": "255.255.255.0",
                    "gateway": "192.168.1.1"
                  },
                  "nameservers": [
                    "1.2.3.4",
                    "1.2.3.5"
                  ]
                },
                {
                  "subnetId": "mocksubnet002",
                  "ipv4Network": {
                    "network": "192.168.2.0",
                    "mask": "255.255.255.0"
                  }
                },
                {
                  "subnetId": "mocksubnet008",
                  "ipv4Network": {
                    "network": "192.168.8.0",
                    "mask": "255.255.255.0",
                    "gateway": "192.168.8.1"
                  },
                  "nameservers": [
                    "4.4.4.4",
                    "8.8.8.8"
                  ]
                },
                {
                  "subnetId": "mocksubnet009",
                  "ipv4Network": {
                    "network": "192.168.9.0",
                    "mask": "255.255.255.0",
                    "gateway": "192.168.9.1"
                  }
                }
              ]
            },
            status: 200
          };

          Promise.all(promiseList)
            .then(responses => {
              responses.length.should.equal(1);
              let subnets = responses[0]
              subnets.should.eql(expected)
            }).then(done, done)

        })
        .catch(err => {
          done(err)
        })
    });
    it('Update Subnet on DHCP', (done) => {
      let promiseList = []
      promiseList.push(dw.send({
        ipv4Network: {
          network: '192.168.1.0',
          mask: '255.255.255.0',
          gateway: '192.168.1.2'
        },
        nameservers: ['1.2.3.4', '1.2.3.5']
      }, 'PUT', 'mocksubnet001'));
      promiseList.push(dw.send({
        nameservers: ['1.2.3.40', '1.2.3.50']
      }, 'PUT', 'mocksubnet002'));


      let expected = [{
        body: {
          "subnet": {
            "subnetId": "mocksubnet001",
            "ipv4Network": {
              "network": "192.168.1.0",
              "mask": "255.255.255.0",
              "gateway": "192.168.1.2"
            },
            "nameservers": [
              "1.2.3.4",
              "1.2.3.5"
            ]
          }
        },
        status: 200
      }, {
        body: {
          "subnet": {
            "subnetId": "mocksubnet002",
            "ipv4Network": {
              "network": "192.168.2.0",
              "mask": "255.255.255.0"
            },
            "nameservers": [
              "1.2.3.40",
              "1.2.3.50"
            ]
          }
        },
        status: 200
      }
      ]

      Promise.all(promiseList)
        .then(responses => {
          console.log(responses)
          responses.length.should.equal(2)
          responses.should.eql(expected)
          done()
        })
        .catch(err => {
          done(err)
        })
    });
  });
  describe('Negative Tests', function () {
    it('Subnet Id already exists', (done) => {
      let promiseList = []
      promiseList.push(dw.send({
        subnetId: 'mocksubnet001',
        ipv4Network: {
          network: '192.168.1.0',
          mask: '255.255.255.0',
          gateway: '192.168.1.1'
        },
        nameservers: ['1.2.3.4', '1.2.3.5']
      }, 'POST'))

      let expected = {
        body: {
            "message": "Subnet 'mocksubnet001' already exists"
        },
        status: 409
      };
      Promise.all(promiseList)
        .then(responses => {
          console.log(responses)
          responses.length.should.equal(1)
          let response3 = responses[0]
          response3.should.eql(expected)
          done()
        })
        .catch(err => {
          done(err)
        })
    });
    it('Invalid Subnet Id', (done) => {
      let promiseList = []
      promiseList.push(dw.send({
        subnetId: 'bad subnet name',
        ipv4Network: {
          network: '192.168.1.0',
          mask: '255.255.255.0'
        },
        nameservers: ['1.2.3.4', '1.2.3.5']
      }, 'POST'))

      let expected = {
        body: {
          "message": "Supplied subnet ID 'bad subnet name' in '{'ipv4Network': {'mask': '255.255.255.0', 'network': '192.168.1.0'}, 'nameservers': ['1.2.3.4', '1.2.3.5'], 'subnetId': 'bad subnet name'}' is not alpha-numeric"
        },
        status: 400
      };
      Promise.all(promiseList)
        .then(responses => {
          console.log(responses)
          responses.length.should.equal(1)
          let response3 = responses[0]
          response3.should.eql(expected)
          done()
        })
        .catch(err => {
          done(err)
        })
    });
    it('Missing Field', (done) => {
      let promiseList = []
      promiseList.push(dw.send({
        subnetId: "MySubnet",
        ipv4Network: {
          network: '192.168.10.0'
        }
      }, 'POST'))
      promiseList.push(dw.send({
        ipv4Network: {
          network: '192.168.10.0',
          mask: '255.255.255.0'
        },
        nameservers: ['1.2.3.4', '1.2.3.5']
      }, 'POST'))

      let expected = [{
        body: {
          "message": "Required field 'mask' missing from {'network': '192.168.10.0'}"
        },
        status: 400
      },
        {
          body: {
           "message": "Required field 'subnetId' missing from {'ipv4Network': {'mask': '255.255.255.0', 'network': '192.168.10.0'}, 'nameservers': ['1.2.3.4', '1.2.3.5']}"
          },
          status: 400
        }
      ];
      Promise.all(promiseList)
        .then(responses => {
          console.log(responses)
          responses.should.eql(expected)
          done()
        })
        .catch(err => {
          done(err)
        })
    });
    it('Invalid Gateway Address', (done) => {
      let promiseList = []
      promiseList.push(dw.send({
        subnetId: 'mocksubnet010',
        ipv4Network: {
          network: '192.168.10.0',
          mask: '255.255.255.0',
          gateway: '192.168.2.1'
        },
        nameservers: ['1.2.3.4', '1.2.3.5']
      }, 'POST'))

      let expected = {
        body: {
          "message": "Gateway address 192.168.2.1 isn't in the 'mocksubnet010' subnet (192.168.10.0/24)"
        },
        status: 400
      };
      Promise.all(promiseList)
        .then(responses => {
          console.log(responses)
          responses.length.should.equal(1)
          let response3 = responses[0]
          response3.should.eql(expected)
          done()
        })
        .catch(err => {
          done(err)
        })
    });
    it('Overlapping Subnets', (done) => {
      let promiseList = []
      promiseList.push(dw.send({
        subnetId: 'mocksubnet010',
        ipv4Network: {
          network: '192.168.0.0',
          mask: '255.255.0.0',
          gateway: '192.168.2.1'
        },
        nameservers: ['1.2.3.4', '1.2.3.5']
      }, 'POST'))

      let expected = {
        body: {
          "message": "Subnet 'mocksubnet010' network 192.168.0.0/16 overlaps existing subnet 'mocksubnet001' (network 192.168.1.0/24)"
        },
        status: 400
      };
      Promise.all(promiseList)
        .then(responses => {
          console.log(responses)
          responses.length.should.equal(1)
          let response3 = responses[0]
          response3.should.eql(expected)
          done()
        })
        .catch(err => {
          done(err)
        })
    });
  });
  describe('Postive Device Tests', function () {

  });
  describe('Clean up', function () {
    it('Delete Subnets', (done) => {
      dw.connect('wss://localhost:5050/micronets/v1/ws-proxy/micronets-dhcp-0001')
        .then(() => {
          let promiseList = []
          promiseList.push(dw.send({}, 'DELETE', 'mocksubnet001'));
          promiseList.push(dw.send({}, 'DELETE', 'mocksubnet002'));
          promiseList.push(dw.send({}, 'DELETE', 'mocksubnet008'));
          promiseList.push(dw.send({}, 'DELETE', 'mocksubnet009'));


          Promise.all(promiseList)
            .then(responses => {
              responses.length.should.equal(4);
              for (let i = 0; i < 4; i++) {
                responses[i].status.should.equal(200) //this should be 204 but its not right now
              }
            }).then(done, done)

        })
        .catch(err => {
          done(err)
        })
    });
    it('Delete All Subnets', (done) => {
      dw.connect('wss://localhost:5050/micronets/v1/ws-proxy/micronets-dhcp-0001')
        .then(() => {
          let promiseList = []
          promiseList.push(dw.send({}, 'DELETE'));

          Promise.all(promiseList)
            .then(responses => {
              responses.length.should.equal(1);
              responses[0].status.should.equal(200) //this should be 204 but its not right now

            }).then(done, done)

        })
        .catch(err => {
          done(err)
        })
    })
  });
});