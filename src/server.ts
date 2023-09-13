import express from "express";
import promBundle from "express-prom-bundle";

const server = express();

server.use(
  promBundle({
    includeMethod: true,
    includePath: true,
  }),
);

export default server;
