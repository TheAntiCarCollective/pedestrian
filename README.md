# Pedestrian

A custom bot designed for [The Anti-Car Collective](https://discord.gg/anticar) Discord server. The bot is designed for general use and can be invited to other servers [here](https://discord.com/api/oauth2/authorize?client_id=1129799374009016401&permissions=10292621143120&scope=bot%20applications.commands).

## Development

Pedestrian is written in [TypeScript](https://www.typescriptlang.org/) using [Node.js](https://nodejs.org/en) as the runtime and [npm](https://www.npmjs.com/) as the package manager. TypeScript is installed automatically with this project's npm setup and npm is installed automatically with Node.js; so only Node.js is required to be installed.

Pedestrian uses [docker-compose](https://docs.docker.com/compose/) and [Flyway](https://flywaydb.org/) to make development as easy as possible. Flyway is installed automatically with this project's docker-compose setup; so only docker-compose is required to be installed.

Once environment variables are set then running the bot locally is as easy as `docker-compose up -d`, `npm install`, `npm run dev`.

### Environment Variables

| Environment Variable | Required | Default Value | Notes                                                                                                  |
| -------------------- | -------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| DISCORD_TOKEN        | ✅       |               | [Create Discord Token](https://discord.com/developers/docs/getting-started#configuring-your-bot)       |
| POSTGRESQL_HOST      | ❌       | localhost     |                                                                                                        |
| POSTGRESQL_PORT      | ❌       | 5432          |                                                                                                        |
| POSTGRESQL_DATABASE  | ❌       | db            |                                                                                                        |
| POSTGRESQL_USER      | ❌       | user          |                                                                                                        |
| POSTGRESQL_PASSWORD  | ❌       | password      |                                                                                                        |
| PROJECT_NAME         | ❌       | Pedestrian    |                                                                                                        |
| REDIS_HOST           | ❌       | localhost     |                                                                                                        |
| REDIS_PORT           | ❌       | 6379          |                                                                                                        |
| REDIS_CLUSTER        | ❌       |               | IIF value is "true" then Redis will run in [cluster mode](https://redis.io/docs/management/scaling/)   |
| REDIS_USERNAME       | ❌       |               |                                                                                                        |
| REDIS_PASSWORD       | ❌       |               |                                                                                                        |
| YOUTUBE_API_KEY      | ✅       |               | [Create YouTube API Key](https://console.cloud.google.com/apis/api/youtube.googleapis.com/credentials) |
