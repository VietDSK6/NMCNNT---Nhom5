import { readConfig } from "./config.js";
import { ControlDatabase } from "./database.js";
import { HttpRunnerClient } from "./runner.js";
import { startResourceSampler } from "./sampler.js";
import { createServer } from "./server.js";

const config = readConfig();
const database = new ControlDatabase(config.databasePath);
database.ensureAdmin(config.adminUsername, config.adminPassword);
database.seedApplications(config.appAVersion, config.appBVersion);

const runnerClient = new HttpRunnerClient(config.runnerBaseUrl, config.runnerSharedSecret);
const server = createServer(config, database, { runnerClient });
const stopSampler = startResourceSampler({ db: database, runnerClient });

const shutdown = async (signal: string) => {
  server.log.info({ signal }, "shutting_down");
  stopSampler();
  await server.close();
  database.close();
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

try {
  await server.listen({ host: config.host, port: config.port });
} catch (error) {
  server.log.error(error);
  stopSampler();
  database.close();
  process.exit(1);
}
