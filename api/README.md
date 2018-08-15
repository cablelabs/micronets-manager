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
 
 #### url: POST `/mm/v1/micronets/cert`
 
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
 	  "wifiCert": "<base64 encoded WiFi Certificate>",
 	  "caCert": "<base64 encoded CA Certificate>"
     }
     
 
 ### 3. Users :
 
 Associated user information.
 
 #### url: POST `/mm/v1/micronets/users`
 
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
                "class": "Medical"
            }
        ]
    }
   
    
 ### 4. Registry :
 Associated registry for each subscriber/user.
 
 #### url: POST `/mm/v1/micronets/registry`
 
 Header Fields:
 
     content-type: "application/json"
     Authorization: "Bearer <JWT token>"
     
 #### Response:
 
    {
           "subscriberId": "9XE3-JI34-00132A",
           "identityUrl": "http://127.0.0.1:3230",
           "dhcpUrl": "http://127.0.0.1:5000",
           "mmUrl": "http://127.0.0.1:3030",
           "mmClientUrl": "http://127.0.0.1:8080",
           "websocketUrl": "wss://74.207.229.106:5050",
           "msoPortalUrl": "http://127.0.0.1:3210",
           "odlUrl": "http://127.0.0.1:18080"
    }
    
    
 ### 5. Gateway Status :
 Reflects if the associated gateway is online or offline
  
 #### url: POST `/mm/v1/micronets/gwty/status`
  
 Header Fields:
   
       content-type: "application/json"
   
 POST Data:
   
       { TBD }
   
 #### Response:
  
     
     { 
       gatewayId: '123',
       status: 'online'
     }
    
     
 ### 6. Micronets Static Config :
 Reflects the associated static configuration required to create a micronet
   
 #### url: POST `/mm/v1/micronets/config`
   
    Header Fields:
    
        content-type: "application/json"
    
 POST Data:
    
        { TBD }
   
 #### Response:
     
      { TBD }
      
     
 ### 7. Initialize Micronet :
 Create default micronets
   
 #### url: POST `/mm/v1/micronets/init`
   
    Header Fields:
      
      content-type: "application/json"
      
 POST Data:
      
          {
                     "micronets" : {
                       "micronet" : [
                         {
                           "name" : "Micronet_Medical",
                           "micronet-subnet-id": "WIRED_enp4s0",
                           "micronet-subnet" : "192.168.250.0/24",
                           "micronet-gateway-ip" : "192.168.250.1",
                           "trunk-gateway-port" : "{{port_trunk}}",
                           "trunk-gateway-ip" : "{{ovshost}}",
                           "dhcp-server-port" : "{{port_bridge}}",
                           "dhcp-zone" : "192.168.250.0/24",
                           "ovs-bridge-name" : "{{bridge}}",
                           "ovs-manager-ip" : "{{ovshost}}",
                           "connected-devices" : []
                         },
                         {
                           "name" : "Micronet_CableLabs",
                           "micronet-subnet-id": "WIRELESS_wlp2s0",
                           "micronet-subnet" : "192.168.251.0/24",
                           "micronet-gateway-ip" : "192.168.251.1",
                           "trunk-gateway-port" : "{{port_trunk}}",
                           "trunk-gateway-ip" : "{{ovshost}}",
                           "dhcp-server-port" : "{{port_bridge}}",
                           "dhcp-zone" : "192.168.251.0/24",
                           "ovs-bridge-name" : "{{bridge}}",
                           "ovs-manager-ip" : "{{ovshost}}",
                           "connected-devices" : []
                         }
                       ]
                     }
                   }
   
 #### Response:
   
      {  
                "id" : "7B2A-BE88-08817Z",
                "name" : "Grandma's LINKSYS 1900",
                "ssid" : "grandma-gw",
                "devices" : [],
                "micronets": {
                    "subnets": [
                        {
                            "name": "Micronet_Medical",
                            "class": "Medical",
                            "trunk-gateway-port": "1",
                            "micronet-bridge-openflow-node-id": "openflow:2945788526319",
                            "ovs-manager-ip": "10.36.32.55",
                            "dhcp-server-port": "LOCAL",
                            "micronet-subnet-id": "WIRED_enp4s0",
                            "dhcp-zone": "192.168.250.0/24",
                            "micronet-id": 1534270984,
                            "micronet-bridge-nodeid": "ovsdb://uuid/686dcad0-9517-4471-b3a1-efc8a204130b/bridge/brmn001",
                            "micronet-subnet": "192.168.250.0/24",
                            "micronet-gateway-ip": "192.168.250.1",
                            "ovs-bridge-name": "brmn001",
                            "trunk-gateway-ip": "10.36.32.55"
                        },
                        {
                            "name": "Micronet_CableLabs",
                            "class": "CableLabs",
                            "trunk-gateway-port": "1",
                            "micronet-bridge-openflow-node-id": "openflow:2945788526319",
                            "ovs-manager-ip": "10.36.32.55",
                            "dhcp-server-port": "LOCAL",
                            "micronet-subnet-id": "WIRELESS_wlp2s0",
                            "dhcp-zone": "192.168.251.0/24",
                            "micronet-id": 1534270985,
                            "micronet-bridge-nodeid": "ovsdb://uuid/686dcad0-9517-4471-b3a1-efc8a204130b/bridge/brmn001",
                            "micronet-subnet": "192.168.251.0/24",
                            "micronet-gateway-ip": "192.168.251.1",
                            "ovs-bridge-name": "brmn001",
                            "trunk-gateway-ip": "10.36.32.55"
                        }
                    ]
                }
      }
      
      
 ### 8. Create subnet in micronet :
 Create subnet in micronet
   
 #### url: POST `/mm/v1/micronets/:micronetId/subnet`
   
    Header Fields:
      
          content-type: "application/json"
      
 POST data:
      
          {
            "micronets" : {
              "micronet" : [
                {
                  "name" : "Micronet_Wired",
                  "micronet-subnet-id": "WIRED_enp4s0",
                  "micronet-subnet" : "192.168.250.0/24",
                  "micronet-gateway-ip" : "192.168.250.1",
                  "trunk-gateway-port" : "{{port_trunk}}",
                  "trunk-gateway-ip" : "{{ovshost}}",
                  "dhcp-server-port" : "{{port_bridge}}",
                  "dhcp-zone" : "192.168.250.0/24",
                  "ovs-bridge-name" : "{{bridge}}",
                  "ovs-manager-ip" : "{{ovshost}}",
                  "connected-devices" : []
                },
                {
                  "name" : "Micronet_Wireless",
                  "micronet-subnet-id": "WIRELESS_wlp2s0",
                  "micronet-subnet" : "192.168.251.0/24",
                  "micronet-gateway-ip" : "192.168.251.1",
                  "trunk-gateway-port" : "{{port_trunk}}",
                  "trunk-gateway-ip" : "{{ovshost}}",
                  "dhcp-server-port" : "{{port_bridge}}",
                  "dhcp-zone" : "192.168.251.0/24",
                  "ovs-bridge-name" : "{{bridge}}",
                  "ovs-manager-ip" : "{{ovshost}}",
                  "connected-devices" : []
                }
              ]
            }
          }
   
 #### Response:
   
      
      {   "id" : "7B2A-BE88-08817Z",
          "name" : "Grandma's LINKSYS 1900",
          "ssid" : "grandma-gw",
          "devices" : [],
          "micronets": {
              "subnets": [
                  {
                      "name": "Micronet_Wired",
                      "class": "Wired",
                      "trunk-gateway-port": "1",
                      "micronet-bridge-openflow-node-id": "openflow:2945788526319",
                      "ovs-manager-ip": "10.36.32.55",
                      "dhcp-server-port": "LOCAL",
                      "micronet-subnet-id": "WIRED_enp4s0",
                      "dhcp-zone": "192.168.250.0/24",
                      "micronet-id": 1534270984,
                      "micronet-bridge-nodeid": "ovsdb://uuid/686dcad0-9517-4471-b3a1-efc8a204130b/bridge/brmn001",
                      "micronet-subnet": "192.168.250.0/24",
                      "micronet-gateway-ip": "192.168.250.1",
                      "ovs-bridge-name": "brmn001",
                      "trunk-gateway-ip": "10.36.32.55"
                  },
                  {
                      "name": "Micronet_Wireless",
                      "class": "Wireless",
                      "trunk-gateway-port": "1",
                      "micronet-bridge-openflow-node-id": "openflow:2945788526319",
                      "ovs-manager-ip": "10.36.32.55",
                      "dhcp-server-port": "LOCAL",
                      "micronet-subnet-id": "WIRELESS_wlp2s0",
                      "dhcp-zone": "192.168.251.0/24",
                      "micronet-id": 1534270985,
                      "micronet-bridge-nodeid": "ovsdb://uuid/686dcad0-9517-4471-b3a1-efc8a204130b/bridge/brmn001",
                      "micronet-subnet": "192.168.251.0/24",
                      "micronet-gateway-ip": "192.168.251.1",
                      "ovs-bridge-name": "brmn001",
                      "trunk-gateway-ip": "10.36.32.55"
                  }
              ]
          }
      }
      
     
 ### 9. Retrieve subnets :
  
 Retrieves subnets in a micronet
  
 #### url: GET `/mm/v1/micronets/:micronetId/subnets`
  
    Header Fields:
     
         content-type: "application/json"
         
 #### Response:
        
        {      "id" : "7B2A-BE88-08817Z",
               "name" : "Grandma's LINKSYS 1900",
               "ssid" : "grandma-gw",
               "devices" : [ 
                   {
                       "clientId" : "https://ST-healthcare.org/",
                       "deviceId" : "h2h0h43188fh1h148pfbf4c8996fb92427ae41e4649b934ca495991b7852b842",
                       "macAddress" : "b8:27:eb:8d:30:27",
                       "class" : "Medical"
                   },
                   {
                        "clientId" : "https://ST-healthcare.org/",
                        "deviceId" : "j2h0j42188fh1h148pfbf4c8996fb92427ae41e4649b934ca495991b7852b842",
                        "macAddress" : "b8:27:eb:df:ae:a7",
                        "class" : "CableLabs"
                   },
                   {
                        "clientId" : "https://ST-healthcare.org/",
                        "deviceId" : "e2h0e52188fh1h148pfbf4c8996fb92427ae41e4649b934ca495991b7852b842",
                        "macAddress" : "b8:27:eb:ab:41:12",
                        "class" : "Entertainment"
                   }
               ],
                    "micronets": {
                        "subnets": [
                            {
                                "name": "Micronet_Medical",
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
                                "name": "Micronet_CableLabs",
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
                                "name": "Micronet_Entertainment",
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
         }
        
   
   
 ### 10. Add devices in micronet :
   
 Add devices to an existing micronet
   
 #### url: POST `/mm/v1/micronets/:micronetId/subnets/:subnetId/device`
   
    Header Fields:
      
          content-type: "application/json"
    
 POST Data:
          
              {
                "micronets" : {
                  "micronet" : [
                    {
                      "name" : "Micronet_Wired_250",
                      "micronet-subnet-id": "WIRED_enp4s0",
                      "micronet-subnet" : "192.168.250.0/24",
                      "micronet-gateway-ip" : "192.168.250.1",
                      "trunk-gateway-port" : "{{port_trunk}}",
                      "trunk-gateway-ip" : "{{ovshost}}",
                      "dhcp-server-port" : "{{port_bridge}}",
                      "dhcp-zone" : "10.36.32.0/24",
                      "ovs-bridge-name" : "{{bridge}}",
                      "ovs-manager-ip" : "{{ovshost}}",
                      "connected-devices" : [
                          {
                            "device-name": "pia",
                            "device-id": "Raspberry-Pi3-Model-B-v1.2",
                            "device-mac" : "b8:27:eb:8d:30:27",
                            "device-ip" : "192.168.250.2",
                            "device-openflow-port" : "{{port_wired}}"
                          }
                      ]
                    },
                    {
                      "name" : "Micronet_Wireless_252",
                      "micronet-subnet-id": "WIRELESS_wlp2s0",
                      "micronet-subnet" : "192.168.252.0/24",
                      "micronet-gateway-ip" : "192.168.252.1",
                      "trunk-gateway-port" : "{{port_trunk}}",
                      "trunk-gateway-ip" : "{{ovshost}}",
                      "dhcp-server-port" : "{{port_bridge}}",
                      "dhcp-zone" : "10.36.32.0/24",
                      "ovs-bridge-name" : "{{bridge}}",
                      "ovs-manager-ip" : "{{ovshost}}",
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
              } 
          
 #### Response:
   
           {      "id" : "7B2A-BE88-08817Z",
                  "name" : "Grandma's LINKSYS 1900",
                  "ssid" : "grandma-gw",
                  "devices" : [ 
                      {
                          "clientId" : "https://ST-healthcare.org/",
                          "deviceId" : "h2h0h43188fh1h148pfbf4c8996fb92427ae41e4649b934ca495991b7852b842",
                          "macAddress" : "b8:27:eb:8d:30:27",
                          "class" : "Wired_250"
                      },
                      {
                           "clientId" : "https://ST-healthcare.org/",
                           "deviceId" : "j2h0j42188fh1h148pfbf4c8996fb92427ae41e4649b934ca495991b7852b842",
                           "macAddress" : "b8:27:eb:df:ae:a7",
                           "class" : "Wireless_252"
                      },
                      {
                           "clientId" : "https://ST-healthcare.org/",
                           "deviceId" : "e2h0e52188fh1h148pfbf4c8996fb92427ae41e4649b934ca495991b7852b842",
                           "macAddress" : "b8:27:eb:ab:41:12",
                           "class" : "Wireless_252"
                      }
                  ],
                          "micronets": {
                              "subnets": [
                                  {
                                      "name": "Micronet_Wired_250",
                                      "class" : "Wired_250",                       
                                      "trunk-gateway-port": "1",
                                      "micronet-bridge-openflow-node-id": "openflow:2945788526319",
                                      "ovs-manager-ip": "10.36.32.55",
                                      "dhcp-server-port": "LOCAL",
                                      "micronet-subnet-id": "WIRED_enp4s0",
                                      "dhcp-zone": "10.36.32.0/24",
                                      "micronet-id": 1533936267,
                                      "micronet-bridge-nodeid": "ovsdb://uuid/686dcad0-9517-4471-b3a1-efc8a204130b/bridge/brmn001",
                                      "connected-devices": [
                                          {
                                              "device-mac": "b8:27:eb:8d:30:27",
                                              "device-ip": "192.168.250.2",
                                              "device-openflow-port": "2",
                                              "device-name": "pia",
                                              "device-id": "Raspberry-Pi3-Model-B-v1.2"
                                          }
                                      ],
                                      "micronet-subnet": "192.168.250.0/24",
                                      "micronet-gateway-ip": "192.168.250.1",
                                      "ovs-bridge-name": "brmn001",
                                      "trunk-gateway-ip": "10.36.32.55"
                                  },
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
 
 3. Start your app
 
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
 
 Copyright (c) 2018
 
 Licensed under the [MIT license](LICENSE).
