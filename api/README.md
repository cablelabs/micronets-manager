# Micronets Manager API's
Micronets Manager backend API's

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
 
 #### url: POST `/micronets/v1/mm/csrt`
 
 Header Fields:
 
     content-type: "application/json"
     Authorization: "Bearer <JWT token>"
 
 POST data:
 
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
 
 #### url: POST `/micronets/v1/mm/cert`
 
 Header Fields:
 
     content-type: "application/json"
     Authorization: "Bearer <JWT token>"
 
 POST data:
 
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
 
 #### url: POST `/micronets/v1/mm/users`
 
 Header Fields:
 
     content-type: "application/json"
     Authorization: "Bearer <JWT token>"
     
 #### Response:
 
    ```
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
    ```
    
 ### 4. Registry :
 Associated registry for each subscriber/user.
 
 #### url: POST `/micronets/v1/mm/registry`
 
 Header Fields:
 
     content-type: "application/json"
     Authorization: "Bearer <JWT token>"
     
 #### Response:
 
    ```
    {
           "subscriberId": "9XE3-JI34-00132A",
           "identityUrl": "http://127.0.0.1:3230",
           "dhcpUrl": "http://127.0.0.1:5000",
           "mmUrl": "http://127.0.0.1:3030",
           "mmClientUrl": "http://127.0.0.1:8080",
           "websocketUrl": "wss://74.207.229.106:5050",
           "msoPortalUrl": "http://127.0.0.1:3210"
    }
    ```
 
 
 ## Getting Started
 
 Getting up and running is as easy as 1, 2, 3.
 
 1. Make sure you have [NodeJS](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed.
 2. Install your dependencies
 
     ```
     cd path/to/micronets-manager-backend; npm install
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
