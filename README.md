# Pedestrian

A custom bot designed for [The Anti-Car Collective](https://discord.gg/anticar) Discord server. The bot is designed for general use and can be invited to other servers [here](https://discord.com/api/oauth2/authorize?client_id=1129799374009016401&permissions=10292621143120&scope=bot%20applications.commands).

## Development

### Requirements

- [Node.js](https://nodejs.org)
- [docker-compose](https://docs.docker.com/compose)

### Environment Variables

Required environment variables must be configured in a `.env` file at the project's root. While [debugging](#debugging), additional environment variables can be configured in a `.env.debug` file at the project's root; for example, setting `REDIS_HOST` and `POSTGRESQL_HOST` to `localhost` is a common debug requirement.

| Environment Variable | Required | Default Value | Notes                                                                                                  |
| -------------------- | -------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| BOT_GUILD_ID         | ❌       |               | Guild ID to enable `/bot`                                                                              |
| DISCORD_TOKEN        | ✅       |               | [Create Discord Token](https://discord.com/developers/docs/getting-started#configuring-your-bot)       |
| ENABLE_CARSIZED      | ❌       |               | IIF value is `true` then `/carsized` is enabled                                                        |
| EXPRESS_PORT         | ❌       | 8080          |                                                                                                        |
| POSTGRESQL_HOST      | ❌       | postgres      |                                                                                                        |
| POSTGRESQL_PORT      | ❌       | 5432          |                                                                                                        |
| POSTGRESQL_DATABASE  | ❌       | db            |                                                                                                        |
| POSTGRESQL_USER      | ❌       | user          |                                                                                                        |
| POSTGRESQL_PASSWORD  | ❌       | password      |                                                                                                        |
| PROJECT_NAME         | ❌       | Pedestrian    |                                                                                                        |
| REDIS_HOST           | ❌       | redis         |                                                                                                        |
| REDIS_PORT           | ❌       | 6379          |                                                                                                        |
| REDIS_CLUSTER        | ❌       |               | IIF value is `true` then Redis will run in [cluster mode](https://redis.io/docs/management/scaling/)   |
| REDIS_USERNAME       | ❌       |               |                                                                                                        |
| REDIS_PASSWORD       | ❌       |               |                                                                                                        |
| YOUTUBE_API_KEY      | ✅       |               | [Create YouTube API Key](https://console.cloud.google.com/apis/api/youtube.googleapis.com/credentials) |

### Quick Start

Simply run `npm start`! Assuming the above requirements are met, the project will automatically be built and deployed locally along with required dependencies and services.

### Debugging

Steps 1-3 is not required if the ask is already installed, updated, and/or running.

1. Run third-party services (`npm run services`)
2. Install dependencies (`npm install`)
3. Build project (`npm run build`)
4. Attach debugger while running `npm run debug`

### Database Migration

It is recommended to dump (`npm run dump`) the database before migrating (`npm run migrate`) in case restoring (`npm run restore`) is required.

### Pull Requests

Tests (`npm test`) must pass for any changes to be merged:

- [tsc](https://www.typescriptlang.org/docs/handbook/compiler-options.html) must not emit any errors
- [ESLint](https://eslint.org) must not emit any errors
- Must be formatted with [Prettier](https://prettier.io) (`npm run prettier`)
