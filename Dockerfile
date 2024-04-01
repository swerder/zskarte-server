FROM node:20-alpine as base
FROM base as build

# Create app directory
WORKDIR /app

#create / own required folder to write
RUN [ -d /app/database ] || mkdir /app/database
RUN chown node:node /app/database

# yarn install
ADD ./package.json ./yarn.lock /app/
RUN yarn install --frozen-lockfile

# Copy all files
ADD . /app

# yarn lint
RUN yarn lint
# yarn build
RUN NODE_ENV=production yarn build

#throw away the source
RUN rm -rf /app/src

#throw away all dependencies
RUN rm -rf node_modules
#only get the one used for run, save in different folder for add in different layer
RUN yarn install --production --modules-folder /node_modules

#use multistage build to lower the image size
FROM base as run
# Create app directory
WORKDIR /app

ENV HOST 0.0.0.0
EXPOSE 1337

# start command
CMD yarn start

LABEL org.opencontainers.image.source=https://github.com/swerder/zskarte-server
LABEL org.opencontainers.image.description="Zivilschutz Karte V3 Server fork by swerder"
LABEL org.opencontainers.image.licenses=MIT

# Copy all node_modules from build stage
COPY --from=build /node_modules /app/node_modules
# Copy all other files from build stage
COPY --from=build /app /app

USER node
