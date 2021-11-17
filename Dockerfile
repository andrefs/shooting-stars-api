# syntax=docker/dockerfile:1


# Build stage

FROM node:11 as build

ENV NODE_ENV=production
WORKDIR /app

COPY --chown=node:node ["package.json", "yarn.lock", "./"]
RUN yarn install --frozen-lockfile

# Run stage

#FROM gcr.io/distroless/nodejs:12
FROM node:11
ENV NODE_ENV=production

COPY --from=build /app /usr/src/ss-api
WORKDIR /usr/src/ss-api/

COPY . ./

ENTRYPOINT ["node", "index.js"]


