FROM node:20.5.0-alpine

WORKDIR /pedestrian

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run check

CMD npm run start
