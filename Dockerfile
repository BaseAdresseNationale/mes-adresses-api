# 1/2 Create build image
FROM node:14-alpine AS build

RUN mkdir -p /opt/api-bal
WORKDIR /opt/api-bal

COPY package.json yarn.lock ./
RUN yarn --production --frozen-lockfile

# 2/2 Create production image
FROM node:14-alpine

RUN mkdir -p /opt/api-bal
WORKDIR /opt/api-bal

COPY --from=build /opt/api-bal .
COPY . .

ENV NODE_ENV=production

EXPOSE 5000
CMD ["node", "server.js"]
