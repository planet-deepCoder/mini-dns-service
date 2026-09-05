import { buildApp } from "./app.js";
import { HOST, PORT } from "./config.js";

const app = await buildApp();

try {
  await app.listen({ port: PORT, host: HOST }); // bind HTTP server
} catch (error) {
  app.log.error(error);
  process.exit(1); // crash if listen fails
}
