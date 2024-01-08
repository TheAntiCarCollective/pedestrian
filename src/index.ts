import { glob } from "glob";
import path from "node:path";

import discord from "./shared/discord";
import Environment from "./shared/environment";
import express from "./shared/express";
import * as observability from "./shared/observability";

// region Logger
const logger = observability.logger(module);
// endregion

const importModules = async () => {
  let paths = await glob(`${__dirname}/**/*.js`);
  logger.trace(paths, "Glob paths for modules to import");
  paths = paths.map((to) => `./${path.relative(__dirname, to)}`);
  logger.debug(paths, "Relative paths for modules to import");

  const imports = paths.map((importPath) => import(importPath));
  await Promise.all(imports);
  logger.info(`Imported ${imports.length} modules`);
};

const startExpress = async () => {
  await new Promise<void>((resolve, reject) => {
    express.once("error", reject);
    express.listen(Environment.ExpressPort, resolve);
  });

  logger.info(`Express is listening on port ${Environment.ExpressPort}`);
};

const startDiscord = async () => {
  await discord.login();
  logger.info("Discord connected to the gateway");
};

const main = async () => {
  try {
    await importModules();
    await startExpress();
    await startDiscord();
  } catch (error) {
    logger.fatal(error, "Exiting process because an error was thrown in main");
    process.exitCode = 1;
  }
};

void main();
