
###########################
# LOCAL-BASED DEVELOPMENT #
###########################

FROM node:20 AS local

WORKDIR /app

COPY package.json ./

RUN yarn install

COPY . .

RUN yarn generate

EXPOSE 3333

CMD ["yarn", "start:dev"]

############################
# DEPLOY-BASED DEVELOPMENT #
############################

FROM node:20 AS deploy

WORKDIR /app

COPY package.json ./

RUN yarn install

COPY . .

RUN yarn generate

RUN yarn build

EXPOSE 3333

RUN rm -rf src && rm -rf test

CMD ["yarn", "start:prod"]
