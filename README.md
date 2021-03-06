# Micronets-Manager
Micronets Manager api

## About

The Micronets manager is an application that enables to create / update / view micro-nets.

## Development

This project is a full stack Javascript application comprised mainly of [ExpressJS](https://expressjs.com/) and [VueJS](https://vuejs.org/). Express, the server logic, is in the `src` folder.  Vue, the UI code, is in the `client` folder.

### Mongo

This project uses MongoDB, a NoSQL document store, for persisting data. In order to run this application locally, you'll need to have MongoDb installed and running on your local development machine.


### Getting Started

#### 1.1 Running the Micronets Manager manually

1. Make sure you have [NodeJS](https://nodejs.org/) , [npm](https://www.npmjs.com/) and [mongoDB](https://www.mongodb.com/) installed and running.

2. Clone the repository
    ```
    git clone https://github.com/cablelabs/micronets-manager.git
    ```

3. Install your dependencies

    ```
    cd micronets-manager
    npm install
    ```
4. Start your server 

    ```
    npm run start
    ```
    
5. Start your server in dev mode

    ```
    npm run dev
    ```

6. Build for production with minification

    ```
    npm run build
    ```

7. Build for production and view the bundle analyzer report

    ```
    npm run build --report
    ```
    
  To install web-client please follow the README in https://github.com/cablelabs/micronets-manager/tree/micronets-manager-integration/app.git   
  
###### Note : Make sure your connected to respective Micronets websocket proxy , Identity Server and MSO Portal before booting Micronets Manager up.
###### Detailed instructions to start the Micronets websocket proxy can be found [here](https://github.com/cablelabs/micronets-ws-proxy#1-quick-start)  
###### By default the Micronets Manager is configured to connect to wss://ws-proxy-api.micronets.in:5050/micronets/v1/ws-proxy/gw/default-gw-${subscriberId} websocket proxy. 
###### When the micronets manager boots up and registry associated with respective subscriber is not populated its uses default.json to locate the corresponding websocket proxy base url and appends the same with subscriberId to construct the web socket proxy url.
###### Detailed instructions to start the MSO Portal can be found [here](https://github.com/cablelabs/micronets-mso-portal#getting-started)  
###### Detailed instructions to start the Identity Server can be found [here](https://github.com/cablelabs/identity-service#getting-started)  
   
#### 1.2 Running the Micronets Manager using Docker

The Micronets Manager distro includes a Dockerfile that can be used to construct Docker images.

To build the Docker images for api and client and start the container :

   ```
    cd micronets-manager/scripts
   ./mm-conatiner.sh create {{subscriberId}}
   ```
###### Note : Make sure your connected to respective Micronets websocket proxy , Identity Server and MSO Portal before booting Micronets Manager up.
###### Detailed instructions to start the Micronets websocket proxy can be found [here](https://github.com/cablelabs/micronets-ws-proxy#1-quick-start)  
###### By default the Micronets Manager is configured to connect to wss://ws-proxy-api.micronets.in:5050/micronets/v1/ws-proxy/gw/default-gw-${SubscriberId} websocket proxy. 
###### To change this configuration please update the webSocketBaseUrl parameter in default.json file present in config directory.When the micronets manager boots up and registry associated with respective subscriber is not populated its uses default.json to locate the construct websocket proxy connection url.
###### Registry api associated with subscriber once populated is used to derive the respective websocket proxy configuration.Websocket proxy configuration in registry api and in config/default.json should match.
###### Detailed instructions to start the MSO Portal can be found [here](https://github.com/cablelabs/micronets-mso-portal#getting-started)  
###### Detailed instructions to start the Identity Server can be found [here](https://github.com/cablelabs/identity-service#getting-started)  
   
#### 1.3 Deploying a Docker image to Artifactory

A `Makefile` is provided to generate the Docker image and upload it to the configured artifact repository. 

To build the docker image run:

```make docker-build```

To push the image to artifactory run:

```make docker-push```

###### Note that the destination repository , path and tag is configured in the `Makefile` and that Docker will request 
credentials in order to perform the push.

#### 1.4 Retrieving the latest docker image from Artifactory

The commands to retrieve the latest Docker image(s) for the Micronets Manager are also contained in the included Makefile. 

To pull the latest Docker(s) run:

```make docker-pull```

###### Note that the source repository and path is configured in the `Makefile`.
No credential should be required to pull the Docker image.

#### 1.5 Running the Micronets Manager

###### Detailed instructions to start the MSO Portal can be found at [here](https://github.com/cablelabs/micronets-mso-portal/blob/master/README.md#getting-started)
###### Detailed instructions to start the Identity server can be found at [here](https://github.com/cablelabs/identity-service)
###### Detailed instructions to start the Micronets websocket proxy can be found [here](https://github.com/cablelabs/micronets-ws-proxy#1-quick-start)  
###### Note : Before consuming Micronets Manager API's it is mandatory to have respective MSO Portal , Identity server and Micronets websocket proxy for the associated subscriber running.

  


