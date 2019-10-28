FROM node:8

## Create app directory
WORKDIR /usr/src/app

RUN ls -a

## Install app dependencies
COPY package.json .

## Install app dependencies
RUN npm install

## Copy all the bits
COPY . .

## Setup the default run command

