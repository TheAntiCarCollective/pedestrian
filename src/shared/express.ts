import express from "express";
import promBundle from "express-prom-bundle";
import pinoBundle from "pino-http";

import loggerFactory from "./logger";

const server = express();

// region Logger and Metrics
const logger = loggerFactory(module);

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
