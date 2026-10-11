import { readConfig } from "./config.js";
import { ControlDatabase } from "./database.js";
import { createServer } from "./server.js";

const config = readConfig();
const database = new ControlDatabase(config.databasePath);
database.ensureAdmin(config.adminUsername, config.adminPassword);
database.seedApplications(config.appAVersion, config.appBVersion);

const server = createServer(config, database);

const shutdown = async (signal: string) => {
  server.log.info({ signal }, "shutting_down");
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
  database.close();
  process.exit(1);
}
