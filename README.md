# micronets-manager
Micronets Manager app

## About

The Micronets manager is an application that enables to create / update / view micro-nets.

## Development

This project is a full stack Javascript application comprised mainly of [ExpressJS](https://expressjs.com/) and [VueJS](https://vuejs.org/). Express, the server logic, is in the `src` folder.  Vue, the UI code, is in the `client` folder.

### Mongo

This project uses MongoDB, a NoSQL document store, for persisting data. In order to run this application locally, you'll need to have MongoDb installed and running on your local development machine.

### Redis

This project uses Redis, an open source (BSD licensed), in-memory data structure store, used as a database, cache and message broker for its communications with MTC . In order to run this application locally, you'll need to have Redis installed and running on your local development machine.

### MTC ( Micronets Topology Controller )

This project uses MTC , a Java/SpringBoot/Tomcat daemon that serves a NB REST maintenance/debug API and is a SB RESTCONF client to OpenDaylight. MTC converts MTL messages published by the MM.

Please follow the instructions ( https://community.cablelabs.com/wiki/display/~mdeazley/Micronets+Topology+Controller+%28MTC%29+Daemon ) to have MTC jar running locally. mtc-0.2.8.jar is the latest version.The current url to download the mtc jar is http://impala.cablelabs.com/mdeazley/mtc/. Before running the MTC make sure to have a MongoDB and Redis connection.

### Getting Started

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
    npm run server
    ```

5. Start your client in dev mode

    ```
    npm run client
    ```


6. Build for production with minification

    ```
    npm run build
    ```


7. Build for production and view the bundle analyzer report

    ```
    npm run build --report
    ```


For detailed explanation on how things work, checkout the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).