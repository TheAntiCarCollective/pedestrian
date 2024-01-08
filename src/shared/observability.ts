import { compress } from "compress-tag";
import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import pino from "pino";
import { collectDefaultMetrics } from "prom-client";

import Environment from "./environment";

// region Types
type Context = {
  [key: keyof never]: unknown;
  correlationId?: string;
};

type CorrelateCallback<T> = () => T;

type Correlate = {
  <T>(callback: CorrelateCallback<T>): T;
  <T>(context: Partial<Context>, callback: CorrelateCallback<T>): T;
};
// endregion

// region Metrics
collectDefaultMetrics();
// endregion

const asyncLocalStorage = new AsyncLocalStorage<Context>();

export const correlationId = () => {
  const { correlationId } = asyncLocalStorage.getStore() ?? {};
  // region assert
  assert(
    correlationId !== undefined,
    compress`
      This function was called outside the callback of an asynchronous context
      initialized by calling correlate
    `,
  );
  // endregion
  return correlationId;
};

export const correlate: Correlate = <T>(
  context: CorrelateCallback<T> | Partial<Context>,
  callback?: CorrelateCallback<T>,
) => {
  if (typeof context === "object") {
    // region assert
    assert(callback !== undefined, "callback is undefined");
    // endregion
  } else {
    callback = context;
    context = {};
  }

  const oldContext = asyncLocalStorage.getStore();
  let newContext: Context;

  if (oldContext === undefined) {
    const { correlationId = randomUUID() } = context;

    newContext = {
      ...context,
      correlationId,
    };
  } else {
    newContext = {
      ...context,
      ...oldContext,
    };
  }

  return asyncLocalStorage.run(newContext, callback);
};

export const logger = ({ id }: NodeModule) =>
  pino({
    base: undefined,
    errorKey: "error",
    formatters: {
      level: (label, number) => ({
        level: label,
        levelValue: number,
      }),
    },
    level: Environment.PinoLevel,
    messageKey: "message",
    mixin: () => asyncLocalStorage.getStore() ?? {},
    name: id,
    nestedKey: "context",
  });
