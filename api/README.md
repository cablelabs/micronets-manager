# Micronets Manager API's
Micronets Manager Backend API's

## About

This project uses [Feathers](http://feathersjs.com). An open source web framework for building modern real-time applications.

## Technology Choices

### Languages:

 1. JavaScript
 2. HTML

### Frameworks:

 1. Feathers - (http://feathersjs.com)

### Data Management:

 1. MongoDB - https://www.mongodb.com/
 2. Mongoose - http://mongoosejs.com/
 
 ## API
 
 ### 1. Request CSR Template
 
 The CSR "template" is just metadata that the client (device) needs when generating a CSR. For now, it is just the encryption type. In addition to the registration token (used to identify the registration context) we also provide the subscriberID, as at this point the subscriber has been authenticated and we know the subscriberID.
 
 #### url: POST `/mm/v1/micronets/csrt`
 
 Header Fields:
 
     content-type: "application/json"
     Authorization: "Bearer <JWT token>"
 
 POST Data:
 
     {
       "subscriberId": "9XE3-JI34-00132A"
     }
 
 The `subscriberId` identifies a subscriber account. The Registration Server obtains this when the subscriber authenticates using the clinic browser (eg. scanning QR Code)
 
 #### Response:
 (optional debug: contents of the registration context)
 
 	{
 	  "csrTemplate": {
 	    "keyType": "RSA:2048"
 	  },
 	  "debug": {
 	    "context": {
 	      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6ImFjY2VzcyIsInR5cGUiOiJhY2Nlc3MifQ.eyJjbGllbnRJRCI6Imh0dHBzOi8va2Fpc2VyLWhlYWx0aGNhcmUub3JnLyIsImRldmljZUlEIjoieTJoMHk3OTc4OXl0MXkyNDh3ZmtmNGs4OTk2ZmI5MjQyN2FlNDFlNDY0OXE5MzRwYTQ5NTk5MWI3ODUycTk4OSIsInZlbmRvciI6IkNPIiwiZHR5cGUiOiJDTyIsIm1vZGVsIjoiQ08iLCJzZXJpYWwiOiJDTy0xNDUyNDIiLCJtYWNBZGRyZXNzIjoiNzI6Nzc6NDI6Z2U6MXI6OTQiLCJjbGFzcyI6Ik1lZGljYWwiLCJpYXQiOjE1MzE1MDM3MzIsImV4cCI6MTUzMTU5MDEzMiwiYXVkIjoibWljcm9uZXRzLmNvbSIsImlzcyI6Imh0dHBzOi8vbXNvLXBvcnRhbC5taWNyb25ldHMuY29tIiwic3ViIjoiSW5pdGlhdGUgcmVnaXN0cmF0aW9uIHRvIG9uLWJvYXJkIGRldmljZSIsImp0aSI6ImFiMDUxNTM2LWY4NWItNDJhZC05OWYwLTUyNzljNzUzMmQ3MSJ9._Tn0zTAQrUDUIuTpKe__EBRZ-dcawqBf_HcifHFvTfw",
 	      "clientID": "www.happyclinic.com",
 	      "deviceID": "730c8aa0a2e535c8caa3e1398c6fdbb476223088551d45315fc4c9941cf55f9e",
 	      "timestamp": 1510077436128,
 	      "subscriber": {
 	        "id": 9XE3-JI34-00132A,
 	        "name": "Grandma",
 	        "ssid": "Grandma's WiFi"
 	      }
 	    }
 	  }
 	}
 	
 ### 2. Submit CSR:
 
 The CSR is submitted to the CA. A wifi certificate is created and signed. The wifi certificate, CA certificate are base64 encoded and returned as JSON along with subscriber metadata.
 
 #### url: POST `/mm/v1/micronets/certificates`
 
 Header Fields:
 
     content-type: "application/json"
     Authorization: "Bearer <JWT token>"
 
 POST Data:
 
     {
       "csr": "<base64 encoded CSR>"
     }
 
 **NOTE:** The CSR, wifiCert and caCert are base64 encoded to preserve line endings. **REQUIRED!**
 
 #### Response:
 The response is ultimately returned to the device.
 
     {
 	  "subscriber": {
 		"id": 9XE3-JI34-00132A,
 		"name": "Grandma",
 		"ssid": "Grandma's WiFi"
 	  },
 	  "passphrase": "testphrase",
 	  "wifiCert": "<base64 encoded WiFi Certificate>",
 	  "caCert": "<base64 encoded CA Certificate>"
     }
     
 
 ### 3. Users :
 
 Associated user information.
 
 #### url: GET `/mm/v1/micronets/users`
 
 Header Fields:
 
     content-type: "application/json"
     Authorization: "Bearer <JWT token>"
     
 #### Response:
 
    {
        "id": "9XE3-JI34-00132A",
        "name": "Grandma",
        "ssid": "Grandma's WiFi",
        "devices": [
            {
                "isRegistered": true,
                "_id": "5b48e47e57682cbc4330ac36",
                "clientId": "https://kaiser-healthcare.org/",
                "deviceId": "y2h0y79789yt1y248wfkf4k8996fb92427ae41e4649q934pa495991b7852q989",
                "macAddress": "72:77:42:ge:1r:94",
                "class": "Medical",
                ﻿"mudUrl" : "https://alpineseniorcare.com/micronets-mud/AgoNDQcDDgg",
                 "deviceId" : "MQkwUwQHUoQIzj0QAQYIKoZIzj0DAQcDIgACDIBBiMf4W",
                 "macAddress" : "5b:85:67:5f:45:cf",
                 "deviceManufacturer" : "HotDawg",
                 "deviceModel" : "Twitter sensor",
                 "deviceAuthority" : "https://alpineseniorcare.com",
                 "deviceModelUID" : "AgoNDQcDDgg",
                 "class" : "Personal",
                 "onboardType" : "dpp",
                 "onboardStatus" : "complete",
                 "psk" : "c83e6d17bc16cdc6a08b3528769dc6f0b18d620aaf8b31a8b1d8ada069ffce07",
                 "deviceIp" : "10.135.1.2",
                 "micronetId" : "Personal"
            }
        ]
    }
   
    
 ### 4. Registry :
 Associated registry for each subscriber/user.
 
 #### url: POST `/mm/v1/micronets/registry`
 
 Header Fields:
 
     content-type: "application/json"
     Authorization: "Bearer <JWT token>"
     
 POST Data:
  
      {
            "subscriberId": "9XE3-JI34-00132A",
            "identityUrl": "http://127.0.0.1:3230",
            "mmUrl": "http://127.0.0.1:3030",
            "mmClientUrl": "http://127.0.0.1:8080",
            "webSocketUrl": "wss://74.207.229.106:5050",
            "msoPortalUrl": "http://127.0.0.1:3210",
            "gatewayId" : "micronets-gw-0001",
      }    
     
 #### Response:
 
    {
           "subscriberId": "9XE3-JI34-00132A",
           "identityUrl": "http://127.0.0.1:3230",
           "mmUrl": "http://127.0.0.1:3030",
           "mmClientUrl": "http://127.0.0.1:8080",
           "webSocketUrl": "wss://74.207.229.106:5050",
           "msoPortalUrl": "http://127.0.0.1:3210",
           "gatewayId" : "micronets-gw-0001",
    }
    
    

 ### 5. Micronets Gateway Config :
 Reflects the associated gateway configuration required to create a micronet
   
 #### url: POST `/mm/v1/micronets/odl`
   
    Header Fields:
    
        content-type: "application/json"
    
 POST Data:
    
        ﻿{
            "version" : "1.0",
            "gatewayId" : "sisterkate-gw",
            "gatewayModel" : "proto-gateway",
            "gatewayVersion" : {
                "major" : "1",
                "minor" : "0",
                "micro" : "0"
            },
            "configRevision" : "1",
            "vlanRanges" : [ 
                {
                    "min" : "1000",
                    "max" : "4095"
                }
            ],
            "micronetInterfaces" : [ 
                {
                    "name" : "wlp2s0",
                    "macAddress" : "2c:d0:5a:6e:ca:3c",
                    "medium" : "wifi",
                    "ssid" : "sisterkate-gw",
                    "dpp" : {
                        "supportedAkms" : [ 
                            "psk"
                        ]
                    },
                    "ipv4SubnetRanges" : [ 
                        {
                            "id" : "range001",
                            "subnetRange" : {
                                "octetA" : "10",
                                "octetB" : "135",
                                "octetC" : {
                                    "min" : "1",
                                    "max" : "5"
                                }
                            },
                            "subnetGateway" : {
                                "octetD" : "1"
                            },
                            "deviceRange" : {
                                "octetD" : {
                                    "min" : "2",
                                    "max" : "254"
                                }
                            }
                        }
                    ],
                    "ipv4Subnets" : []
                }, 
                {
                    "name" : "enp0s31f6",
                    "macAddress" : "00:30:18:0a:ce:3d",
                    "medium" : "ethernet",
                    "ipv4Subnets" : [ 
                        {
                            "subnetRange" : {
                                "octetA" : "10",
                                "octetB" : "135",
                                "octetC" : "250"
                            },
                            "subnetGateway" : {
                                "octetD" : "1"
                            },
                            "deviceRange" : {
                                "octetD" : {
                                    "min" : "2",
                                    "max" : "254"
                                }
                            }
                        }
                    ],
                    "ipv4SubnetRanges" : []
                }
            ]
        }   
 #### Response:
     
      ﻿{
                  "version" : "1.0",
                  "gatewayId" : "sisterkate-gw",
                  "gatewayModel" : "proto-gateway",
                  "gatewayVersion" : {
                      "major" : "1",
                      "minor" : "0",
                      "micro" : "0"
                  },
                  "configRevision" : "1",
                  "vlanRanges" : [ 
                      {
                          "min" : "1000",
                          "max" : "4095"
                      }
                  ],
                  "micronetInterfaces" : [ 
                      {
                          "name" : "wlp2s0",
                          "macAddress" : "2c:d0:5a:6e:ca:3c",
                          "medium" : "wifi",
                          "ssid" : "sisterkate-gw",
                          "dpp" : {
                              "supportedAkms" : [ 
                                  "psk"
                              ]
                          },
                          "ipv4SubnetRanges" : [ 
                              {
                                  "id" : "range001",
                                  "subnetRange" : {
                                      "octetA" : "10",
                                      "octetB" : "135",
                                      "octetC" : {
                                          "min" : "1",
                                          "max" : "5"
                                      }
                                  },
                                  "subnetGateway" : {
                                      "octetD" : "1"
                                  },
                                  "deviceRange" : {
                                      "octetD" : {
                                          "min" : "2",
                                          "max" : "254"
                                      }
                                  }
                              }
                          ],
                          "ipv4Subnets" : []
                      }, 
                      {
                          "name" : "enp0s31f6",
                          "macAddress" : "00:30:18:0a:ce:3d",
                          "medium" : "ethernet",
                          "ipv4Subnets" : [ 
                              {
                                  "subnetRange" : {
                                      "octetA" : "10",
                                      "octetB" : "135",
                                      "octetC" : "250"
                                  },
                                  "subnetGateway" : {
                                      "octetD" : "1"
                                  },
                                  "deviceRange" : {
                                      "octetD" : {
                                          "min" : "2",
                                          "max" : "254"
                                      }
                                  }
                              }
                          ],
                          "ipv4SubnetRanges" : []
                      }
                  ]
              }   
      
     

 ### 6. Create a micronet :
 Create a micronet associated with particular subscriber
   
 #### url: POST `/mm/v1/subscriber/:id/micronets`
   
    Header Fields:
      
          content-type: "application/json"
      
 POST data:
      
          {
            "micronets" : [
                {
                  "name" : "Heart Rate Monitor",
                  "class": "Medical"
                  "micronet-subnet-id": "Medical"
                } 
            ]
          }
   
 #### Response:
   
      
      {   "id" : "7B2A-BE88-08817Z",
          "name" : "Grandma's LINKSYS 1900",
          "ssid" : "grandma-gw",
          "micronets": [
                  {
                      "name": "Heart Rate Monitor",
                      "class": "Medical",
                      "trunk-gateway-port": "1",
                      "micronet-bridge-openflow-node-id": "openflow:2945788526319",
                      "ovs-manager-ip": "10.36.32.55",
                      "dhcp-server-port": "LOCAL",
                      "micronet-subnet-id": "Medical",
                      "dhcp-zone": "192.168.250.0/24",
                      "micronet-id": 1534270984,
                      "micronet-subnet": "192.168.250.0/24",
                      "micronet-gateway-ip": "192.168.250.1",
                      "ovs-bridge-name": "brmn001",
                      "trunk-gateway-ip": "10.36.32.55"
                  }   
          ]
      }
      
     
 ### 7. Retrieve micronet :
  
 Retrieves a specific micronet associated with the subscriber
  
 #### url: GET `/mm/v1/subscriber/:id/micronets/:micronetId`
  
    Header Fields:
     
         content-type: "application/json"
         
 #### Response:
        
        {      "id" : "7B2A-BE88-08817Z",
               "name" : "Grandma's LINKSYS 1900",
               "ssid" : "grandma-gw",
                    "micronets": [
                            {
                                "name": "Medical",
                                "class" : "Medical"
                                "trunk-gateway-port": "1",
                                "connected-devices": [
                                    {
                                        "device-mac": "b8:27:eb:8d:30:27",
                                        "device-ip": "192.168.250.2",
                                        "device-openflow-port": "2",
                                        "device-name": "pia",
                                        "device-id": "Raspberry-Pi3-Model-B-v1.2"
                                    }
                                ],
                                "ovs-manager-ip": "10.36.32.55",
                                "micronet-subnet": "192.168.250.0/24",
                                "dhcp-server-port": "LOCAL",
                                "micronet-gateway-ip": "192.168.250.1",
                                "ovs-bridge-name": "brmn001",
                                "micronet-subnet-id": "WIRED_enp4s0",
                                "dhcp-zone": "10.36.32.0/24",
                                "trunk-gateway-ip": "10.36.32.55"
                            },
                            {
                                "name": "CableLabs",
                                "class" : "CableLabs"
                                "trunk-gateway-port": "1",
                                "connected-devices": [
                                    {
                                        "device-mac": "b8:27:eb:df:ae:a7",
                                        "device-ip": "192.168.251.2",
                                        "device-openflow-port": "3",
                                        "device-name": "pib",
                                        "device-id": "Raspberry-Pi3-Model-B-v1.2"
                                    }
                                ],
                                "ovs-manager-ip": "10.36.32.55",
                                "micronet-subnet": "192.168.251.0/24",
                                "dhcp-server-port": "LOCAL",
                                "micronet-gateway-ip": "192.168.251.1",
                                "ovs-bridge-name": "brmn001",
                                "micronet-subnet-id": "WIRED_enp4s0",
                                "dhcp-zone": "192.168.251.0/24",
                                "trunk-gateway-ip": "10.36.32.55"
                            },
                            {
                                "name": "Entertainment",
                                "class" : "Entertainment"
                                "trunk-gateway-port": "1",
                                "connected-devices": [
                                    {
                                        "device-mac": "b8:27:eb:ab:41:12",
                                        "device-ip": "192.168.252.2",
                                        "device-openflow-port": "4",
                                        "device-name": "picw",
                                        "device-id": "Raspberry-Pi3-Model-B-v1.2"
                                    }
                                ],
                                "ovs-manager-ip": "10.36.32.55",
                                "micronet-subnet": "192.168.252.0/24",
                                "dhcp-server-port": "LOCAL",
                                "micronet-gateway-ip": "192.168.252.1",
                                "ovs-bridge-name": "brmn001",
                                "micronet-subnet-id": "WIRELESS_wlp2s0",
                                "dhcp-zone": "10.36.32.0/24",
                                "trunk-gateway-ip": "10.36.32.55"
                            }
                    ]
         }
        
   
   
 ### 8. Add devices in micronet :
   
 Add devices to an existing micronet
   
 #### url: POST `/mm/v1/subscriber/:id/micronets/:micronetId/devices`
   
    Header Fields:
      
          content-type: "application/json"
    
 POST Data:
          
              {
                "micronets" : [
                    {
                        "connected-devices" : [
                          {
                            "device-name": "picw",
                            "device-id": "Raspberry-Pi3-Model-B-v1.2",
                            "device-mac" : "b8:27:eb:ab:41:12",
                            "device-ip" : "192.168.252.2",
                            "device-openflow-port" : "{{port_wireless}}"
                          },
                          {
                            "device-name": "pidw",
                            "device-id": "Raspberry-Pi3-Model-B-v1.2",
                            "device-mac" : "b8:27:eb:19:11:87",
                            "device-ip" : "192.168.252.3",
                            "device-openflow-port" : "{{port_wireless}}"
                          }
                        ]
                    }
                ]
              } 
          
 #### Response:
   
           {      "id" : "7B2A-BE88-08817Z",
                  "name" : "Grandma's LINKSYS 1900",
                  "ssid" : "grandma-gw",
                          "micronets": {
                              "micronet": [
                                  {
                                      "name": "Micronet_Wireless_252",
                                      "class" : "Wireless_252",    
                                      "trunk-gateway-port": "1",
                                      "micronet-bridge-openflow-node-id": "openflow:2945788526319",
                                      "ovs-manager-ip": "10.36.32.55",
                                      "dhcp-server-port": "LOCAL",
                                      "micronet-subnet-id": "WIRELESS_wlp2s0",
                                      "dhcp-zone": "10.36.32.0/24",
                                      "micronet-id": 1533936269,
                                      "micronet-bridge-nodeid": "ovsdb://uuid/686dcad0-9517-4471-b3a1-efc8a204130b/bridge/brmn001",
                                      "connected-devices": [
                                          {
                                              "device-mac": "b8:27:eb:ab:41:12",
                                              "device-ip": "192.168.252.2",
                                              "device-openflow-port": "4",
                                              "device-name": "picw",
                                              "device-id": "Raspberry-Pi3-Model-B-v1.2"
                                          },
                                          {
                                              "device-mac": "b8:27:eb:19:11:87",
                                              "device-ip": "192.168.252.3",
                                              "device-openflow-port": "4",
                                              "device-name": "pidw",
                                              "device-id": "Raspberry-Pi3-Model-B-v1.2"
                                          }
                                      ],
                                      "micronet-subnet": "192.168.252.0/24",
                                      "micronet-gateway-ip": "192.168.252.1",
                                      "ovs-bridge-name": "brmn001",
                                      "trunk-gateway-ip": "10.36.32.55"
                                  }
                              ]
                          }
                      
           }
           
      
        
 ## Getting Started
 
 Getting up and running is as easy as 1, 2, 3.
 
 1. Make sure you have [NodeJS](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed.
 2. Install your dependencies
 
     ```
     cd path/to/micronets-manager; npm install
     ```
 
 3. Start your api
 
     ```
     npm start
     ```
 
 ## Testing
 
 Simply run `npm test` and all your tests in the `test/` directory will be run.
 
 ## Scaffolding
 
 Feathers has a powerful command line interface. Here are a few things it can do:
 
 ```
 $ npm install -g @feathersjs/cli          # Install Feathers CLI
 
 $ feathers generate service               # Generate a new Service
 $ feathers generate hook                  # Generate a new Hook
 $ feathers generate model                 # Generate a new Model
 $ feathers help                           # Show all commands
 ```
 
 ## Help
 
 For more information on all the things you can do with Feathers visit [docs.feathersjs.com](http://docs.feathersjs.com).
 
 ## Changelog
 
 __0.1.0__
 
 - Initial release
 
 ## License
 
 Copyright (c) 2019
 
 Licensed under the [MIT license](LICENSE).
