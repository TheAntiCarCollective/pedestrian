import path from "node:path";
import pino from "pino";

export default ({ filename }: NodeModule) =>
  pino({
    errorKey: "error",
    formatters: {
      bindings: () => ({
        name: path.relative(__dirname, filename),
      }),
      level: (label, value) => ({
        level: label,
        levelValue: value,
      }),
    },
    level: "debug",
    messageKey: "message",
  });
