# Pedestrian

A custom bot designed for [The Anti-Car Collective](https://discord.gg/anticar) Discord server. The bot is designed for general use and can be invited to other servers [here](https://discord.com/api/oauth2/authorize?client_id=1129799374009016401&permissions=10292621143120&scope=bot%20applications.commands).

## Development

[Node.js](https://nodejs.org) and [docker-compose](https://docs.docker.com/compose) is required for development.

Starting (`npm run start`) requires the project to be installed (`npm install`), built (`npm run build`), have services running (`npm run services`), and required [environment variables](#environment-variables) configured.

It is recommended to dump (`npm run dump`) the database before migrating (`npm run migrate`) in case restoring (`npm run restore`) is required.

Code must pass minimum quality standards checks (`npm run check`) to be merged:

- [tsc](https://www.typescriptlang.org/docs/handbook/compiler-options.html) must not emit any errors
- [ESLint](https://eslint.org) must not emit any errors
- Must be formatted with [Prettier](https://prettier.io) (`npm run prettier`)

### Environment Variables

| Environment Variable | Required | Default Value | Notes                                                                                                  |
| -------------------- | -------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| BOT_GUILD_ID         | ❌       |               | Guild ID to enable `/bot`                                                                              |
| DISCORD_TOKEN        | ✅       |               | [Create Discord Token](https://discord.com/developers/docs/getting-started#configuring-your-bot)       |
| EXPRESS_PORT         | ❌       | 8080          |                                                                                                        |
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
