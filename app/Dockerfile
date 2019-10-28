FROM node:8

## Create app directory
WORKDIR /usr/src/app

RUN ls -a

## Install app dependencies
COPY package.json .

## Install app dependencies
RUN npm install

## Bundle app source
COPY . .

CMD ["npm", "run", "start"]
