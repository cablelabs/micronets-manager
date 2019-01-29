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

1. Make sure you have [NodeJS](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed.

2. Clone the repository
    ```
    git clone https://github.com/cablelabs/micronets-manager.git
    ```

3. Install your dependencies

    ```
    cd micronets-manager
    npm install
    ```

4. Start your server in dev mode

    ```
    npm run dev
    ```

5. Build for production with minification

    ```
    npm run build
    ```

6. Build for production and view the bundle analyzer report

    ```
    npm run build --report
    ```
  To install web-client please follow the README in https://github.com/cablelabs/micronets-manager/tree/micronets-manager-integration/app.git   
  
###### Note : Make sure your connected to the respective Micronets websocket proxy before booting Micronets Manager up.
###### Detailed instructions to start the the Micronets websocket proxy can be found [here](https://github.com/cablelabs/micronets-ws-proxy#1-quick-start)  

###### By default the Micronets Manager is configured to connect to wss://ws-proxy-api.micronets.in:5050/micronets/v1/ws-proxy/micronets-gw-0001 websocket proxy. 
###### To change this configuration please update the websockrtUrl parameter in default.json file present in config directory.When the micronets manager boots up and registry associated with respective subscriber is not populated its uses config.json to locate the corresponding websocket proxy.
###### Registry api associated with subscriber once populated is used to derive the respective websocket proxy configuration.    
#### 1.2 Running the Micronets Manager using Docker

The Micronets Manager distro includes a Dockerfile that can be used to construct Docker images.

To build the Docker images for api and client and start the container :

   ```
    cd micronets-manager/docker/dev
    docker-compose up --build
   ```
###### Note : Make sure your connected to the respective Micronets websocket proxy before booting Micronets Manager up.
###### Detailed instructions to start the Micronets websocket proxy can be found [here](https://github.com/cablelabs/micronets-ws-proxy#1-quick-start)

###### By default the Micronets Manager is configured to connect to wss://ws-proxy-api.micronets.in:5050/micronets/v1/ws-proxy/micronets-gw-0001 websocket proxy. 
###### To change this configuration please update the websockrtUrl parameter in default.json file present in config directory.When the micronets manager boots up and registry associated with respective subscriber is not populated its uses config.json to locate the corresponding websocket proxy.
###### Registry api associated with subscriber once populated is used to derive the respective websocket proxy configuration.   
   
#### 1.3 Deploying a Docker image to Artifactory

A `Makefile` is provided to generate the Docker image and upload it to the configured artifact repository. 

Both can be accomplished by running:

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

The Micronets Manager distro includes database population scripts that can be used for the initial setup.

The scripts/data folder contain examples to populate the switch config and registry database associated with subscriber.

Before running the populate_db script make sure MSO Portal is up and running along with identity server.
###### Detailed instructions to start the MSO Portal can be found at [here](https://github.com/cablelabs/micronets-mso-portal/blob/master/README.md#getting-started)
###### Detailed instructions to start the Identity server can be found at [here](https://github.com/cablelabs/identity-service)

To populate the database please run the following command :

 ```make populate_db```

###### Note the json files in scripts/data used to populate the database are samples.Please changed according.Having a valid switch config, registry database with respect to associated subscriber is mandatory.

   


