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
    
  #### 1.2 Running the Micronets Manager using Docker

To install web-client please follow the README in https://github.com/cablelabs/micronets-manager/tree/micronets-manager-integration/app.git 


For detailed explanation on how things work, checkout the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).
