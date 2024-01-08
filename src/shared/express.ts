import type { Request } from "express";
import type { ServerResponse } from "node:http";

import express from "express";
import { randomUUID } from "node:crypto";
import pinoBundle, { startTime } from "pino-http";
import { Histogram, register } from "prom-client";

import * as observability from "./observability";

const server = express();

// region Logger and Metrics
const httpRequestDuration = new Histogram({
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path", "statusCode"],
  name: "http_request_duration_seconds",
});

const observe = (
  request: Request,
  response: ServerResponse,
  responseTime: number,
) => {
  const route: unknown = request.route;
  let path: string | undefined;

  if (typeof route === "object" && route !== null && "path" in route) {
    const { path: routePath } = route;
    if (typeof routePath === "string") path = routePath;
  }

  const { method } = request;
  const { statusCode } = response;

  const labels = { method, path, statusCode };
  httpRequestDuration.observe(labels, responseTime / 1000);
};

const logger = pinoBundle<Request>({
  customAttributeKeys: {
    err: "error",
    req: "request",
    reqId: "correlationId",
    res: "response",
  },
  customErrorMessage: (request, response) => {
    const responseTime = Date.now() - response[startTime];
    observe(request, response, responseTime);
    return `Request errored in ${responseTime}ms`;
  },
  customLogLevel: (request, { statusCode }) => {
    if (statusCode >= 500) return "error";
    else if (statusCode >= 400) return "warn";
    else return "info";
  },
  customSuccessMessage: (request, response, responseTime) => {
    observe(request, response, responseTime);
    return `Request succeeded in ${responseTime}ms`;
  },
  genReqId: observability.correlationId,
  logger: observability.logger(module),
});

server.use((request, response, next) => {
  response[startTime] = Date.now();

  let correlationId = request.headers["X-Request-Id"];
  if (Array.isArray(correlationId)) correlationId = correlationId[0];
  correlationId ??= randomUUID();

  response.setHeader("X-Request-Id", correlationId);
  observability.correlate({ correlationId }, () => {
    logger(request, response, next);
  });
});

server.get("/metrics", (request, response, next) => {
  register
    .metrics()
    .then((metrics) => {
      response.setHeader("Content-Type", register.contentType);
      response.send(metrics);

      const { log } = response;
      log.debug(`Global register metrics:\n${metrics}`);
    })
    .catch(next);
});
// endregion

export default server;
