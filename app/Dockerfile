FROM node:8

WORKDIR /usr/src/app

# Bundle app source
COPY . .
RUN ls -a

RUN npm install

CMD ["npm", "run", "client"]
