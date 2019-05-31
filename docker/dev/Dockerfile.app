FROM node:latest

WORKDIR /usr/src/app

# Bundle app source
COPY app .
RUN ls -a

RUN npm install

EXPOSE 8080

CMD ["npm", "run", "client"]