FROM node:20-slim AS base

# Install OpenSSL for Prisma and procps for NestJS watch mode
RUN apt-get update -y && apt-get install -y openssl procps && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn generate

###########################
# LOCAL-BASED DEVELOPMENT #
###########################

FROM base AS local
EXPOSE 3333
CMD ["yarn", "start:dev"]

############################
# DEPLOY-BASED DEVELOPMENT #
############################

FROM base AS deploy
RUN yarn build
EXPOSE 3333
RUN rm -rf src && rm -rf test
CMD ["yarn", "start:prod"]
