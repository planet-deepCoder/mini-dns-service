// Drain the queue until abort; one failed job does not stop the worker.
export async function runWorker(queue, handlers, signal, logger) {
  while (!signal?.aborted) {
    const job = await queue.dequeue(signal);
    if (!job) {
      break; // aborted or queue closed
    }

    const handler = handlers[job.type];
    if (!handler) {
      logger?.warn(`No handler registered for job type '${job.type}'`);
      continue;
    }

    try {
      await handler(job);
    } catch (error) {
      logger?.error(
        { err: error, jobId: job.id, jobType: job.type },
        "Background job failed",
      );
    }
  }
}
