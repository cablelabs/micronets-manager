FROM node:latest

WORKDIR /usr/src/app

# Install app dependencies
COPY app/package.json .
COPY app/package.json app/package-lock.json ./

RUN npm install

# Bundle app source
COPY app .

EXPOSE 8080

CMD ["npm", "run", "dev"]
