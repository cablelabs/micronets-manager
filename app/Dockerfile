FROM node:8

WORKDIR /usr/src/app

# Bundle app source
COPY . .
RUN ls -a

RUN npm install

EXPOSE 8080

CMD ["npm", "run", "client"]
