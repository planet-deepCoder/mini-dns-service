import Fastify from "fastify";

import { QUERY_LOG_MAX_ENTRIES, QUEUE_MAX_SIZE, WORKER_CONCURRENCY } from "./config.js";
import { DnsError } from "./errors.js";
import { JobQueue, startBackgroundJobs } from "./jobs/index.js";
import { QueryLogStore } from "./queryLog.js";
import analyticsRoutes from "./routes/analytics.js";
import dnsRoutes from "./routes/dns.js";
import { DnsService } from "./service.js";
import { DnsStore } from "./store.js";

// Build the Fastify app (store/queue injectable for tests).
export async function buildApp({
  store,
  queue,
  queryLogs,
  workerConcurrency,
  logger = true,
} = {}) {
  const dnsStore = store ?? new DnsStore();
  const jobQueue = queue ?? new JobQueue({ maxSize: QUEUE_MAX_SIZE });
  const queryLogStore = queryLogs ?? new QueryLogStore({ maxEntries: QUERY_LOG_MAX_ENTRIES });
  const dnsService = new DnsService(dnsStore, { queue: jobQueue });
  const concurrency =
    workerConcurrency === undefined ? WORKER_CONCURRENCY : workerConcurrency;

  const app = Fastify({
    logger,
    ajv: {
      customOptions: {
        removeAdditional: false, // do not silently drop unknown fields
        coerceTypes: false,
        allErrors: true,
      },
    },
  });

  app.decorate("dnsStore", dnsStore);
  app.decorate("dnsService", dnsService);
  app.decorate("jobQueue", jobQueue);
  app.decorate("queryLogs", queryLogStore);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof DnsError) {
      return reply.status(error.statusCode).send(error.toJSON());
    }

    if (error.validation || error.code === "FST_ERR_VALIDATION") {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "Request validation failed.",
        details: { errors: error.validation },
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
    });
  });

  app.get("/health", async () => ({ status: "ok" }));

  await app.register(dnsRoutes);
  await app.register(analyticsRoutes);

  const abortController = new AbortController();
  let jobsPromise = Promise.resolve();

  app.addHook("onReady", async () => {
    jobsPromise = startBackgroundJobs({
      queue: jobQueue,
      queryLogs: queryLogStore,
      concurrency,
      signal: abortController.signal,
      logger: app.log,
    });
  });

  app.addHook("onClose", async () => {
    abortController.abort(); // stop workers
    jobQueue.close();
    await jobsPromise;
  });

  return app;
}
