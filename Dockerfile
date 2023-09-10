FROM node:20.5.0

WORKDIR /pedestrian

COPY package*.json ./

ENV NODE_ENV=production

RUN npm ci

COPY . .

RUN npm run check

CMD npm run start
