import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import { DnsNotFoundError } from "../src/errors.js";
import { createJobHandlers, runWorker } from "../src/jobs/index.js";
import { JobQueue } from "../src/jobs/queue.js";
import { QueryLogStore } from "../src/queryLog.js";
import { DnsService } from "../src/service.js";
import { DnsStore } from "../src/store.js";

async function drain(queue, handlers, { count = 1, timeoutMs = 500 } = {}) {
  const abort = new AbortController();
  const worker = runWorker(queue, handlers, abort.signal);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (queue.dequeued >= count) {
      break;
    }
    await delay(10);
  }
  abort.abort();
  queue.close();
  await worker;
}

test("resolve enqueues a query log without writing it inline", async () => {
  const queue = new JobQueue();
  const logs = new QueryLogStore();
  const service = new DnsService(new DnsStore(), { queue });
  const handlers = createJobHandlers({ queryLogs: logs });

  service.addRecord("A", "example.com", "192.168.1.1");
  service.resolve("example.com");

  assert.equal(logs.entries.length, 0, "the request path must not write the log itself");
  await drain(queue, handlers, { count: 1 });
  assert.equal(logs.entries.length, 1);
  assert.equal(logs.entries[0].hostname, "example.com");
  assert.equal(logs.entries[0].found, true);
  assert.deepEqual(logs.entries[0].resolvedIps, ["192.168.1.1"]);
});

test("failed resolves are still logged asynchronously", async () => {
  const queue = new JobQueue();
  const logs = new QueryLogStore();
  const service = new DnsService(new DnsStore(), { queue });
  const handlers = createJobHandlers({ queryLogs: logs });

  assert.throws(() => service.resolve("missing.example.com"), DnsNotFoundError);
  await drain(queue, handlers, { count: 1 });
  assert.equal(logs.entries[0].found, false);
  assert.equal(logs.entries[0].error, "NOT_FOUND");
});

test("query.log jobs are dropped when the queue is full", () => {
  const queue = new JobQueue({ maxSize: 1 });
  const service = new DnsService(new DnsStore(), { queue });
  service.addRecord("A", "example.com", "10.0.0.1");
  service.resolve("example.com");
  service.resolve("example.com");
  assert.equal(queue.dropped, 1);
  assert.equal(queue.size, 1);
  queue.close();
});
