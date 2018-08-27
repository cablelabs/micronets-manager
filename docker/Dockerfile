FROM node:8


# set working directory
WORKDIR /app
# copy project file
COPY app/package.json .

# install ALL node_modules, including 'devDependencies'
RUN npm install

# copy all project
COPY app .

# copy all project
COPY api .

# Install app dependencies
COPY package.json .
COPY package.json package-lock.json ./
COPY app/package.json .
COPY app/package.json app/package-lock.json ./

# build the client
# RUN node build/build.js


EXPOSE 8080

CMD [ "npm", "run", "client" ]
