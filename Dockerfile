FROM node:20.8.0

WORKDIR /pedestrian

# Express port
EXPOSE 8080

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run check \
    && npx tsc

CMD node --no-warnings --enable-source-maps build/index.js
