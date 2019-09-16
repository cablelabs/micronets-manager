FROM node:latest

WORKDIR /usr/src/micronets-manager

RUN apt-get update;

# Bundle api source
COPY . .
RUN ls -a

ENV MONGO_URL=
RUN npm install

EXPOSE 3030

CMD ["npm", "run", "start"]
