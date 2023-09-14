FROM node:20.6.0 as buildDependencies
WORKDIR /pedestrian
COPY package*.json ./
RUN npm ci

FROM node:20.6.0 as dependencies
WORKDIR /pedestrian
COPY package*.json ./
ENV NODE_ENV=production
RUN npm ci

FROM node:20.6.0 as build
WORKDIR /pedestrian
COPY --from=buildDependencies /pedestrian/node_modules node_modules
COPY . .
RUN npm run check
RUN npm run build

FROM node:20.6.0
WORKDIR /pedestrian
COPY --from=dependencies /pedestrian/node_modules node_modules
COPY --from=build /pedestrian/build build

EXPOSE 8080
CMD node --no-warnings --enable-source-maps build/index.js
