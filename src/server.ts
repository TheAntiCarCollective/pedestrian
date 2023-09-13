import express from "express";
import pinoBundle from "pino-http";
import promBundle from "express-prom-bundle";
import loggerFactory from "pino";

const server = express();

// region Logger and Metrics
const logger = loggerFactory({
  name: __filename,
});

server.use(
  promBundle({
    includeMethod: true,
    includePath: true,
  }),
);

server.use(
  pinoBundle({
    logger,
  }),
);
// endregion

export default server;
