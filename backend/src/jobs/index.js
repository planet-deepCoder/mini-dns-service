import { createJobHandlers } from "./handlers.js";
import { runWorker } from "./worker.js";

export { createJobHandlers } from "./handlers.js";
export { JobQueue } from "./queue.js";
export { runWorker } from "./worker.js";

// Start worker loops that drain query.log jobs.
export function startBackgroundJobs({
  queue,
  queryLogs,
  concurrency = 1,
  signal,
  logger,
}) {
  const handlers = createJobHandlers({ queryLogs, logger });
  const tasks = [];

  for (let i = 0; i < concurrency; i++) {
    tasks.push(runWorker(queue, handlers, signal, logger));
  }

  logger?.info(`Query-log workers started (concurrency=${concurrency})`);
  return Promise.all(tasks);
}
