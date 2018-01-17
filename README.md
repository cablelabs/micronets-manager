# micronets-manager
Micronets Manager app

## About

The Micronets manager is an application that enables to create / update / view micro-nets.

### Mongo

This project uses MongoDB, a NoSQL document store, for persisting data. In order to run this application locally, you'll need to have
MongoDb installed and running on your local development machine.

### Redis

This project uses Redis, an open source (BSD licensed), in-memory data structure store, used as a database, cache and message broker for its communications with MTC . In order to run this application locally, you'll need to have Redis installed and running on your local development machine.

### MTC ( Micronets Topology Controller )

This project uses MTC , a Java/SpringBoot/Tomcat daemon that serves a NB REST maintenance/debug API and is a SB RESTCONF client to OpenDaylight. MTC converts MTL messages published by the MM.
Please follow the instructions ( https://community.cablelabs.com/wiki/display/~mdeazley/Micronets+Topology+Controller+%28MTC%29+Daemon ) to have MTC jar running locally. mtc-0.2.8.jar is the latest version.Before running the MTC make sure to have a MongoDB and Redis connection.

## Build Setup

To run Micronets manager locally please make sure to install mongo

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report
```

For detailed explanation on how things work, checkout the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).