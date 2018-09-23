FROM node:latest

WORKDIR /usr/src/micronets-manager

# Bundle api source
COPY . .

ENV MONGO_URL=
WORKDIR /usr/src/micronets-manager/app

RUN npm install

EXPOSE 8080

CMD ["npm", "run", "client"]