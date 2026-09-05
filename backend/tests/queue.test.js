import assert from "node:assert/strict";
import { test } from "node:test";

import { JobQueue } from "../src/jobs/queue.js";

test("enqueue then dequeue returns the job", async () => {
  const queue = new JobQueue();
  const job = queue.enqueue("query.log", { hostname: "example.com" });
  const pulled = await queue.dequeue();
  assert.equal(pulled.id, job.id);
  assert.equal(pulled.type, "query.log");
  assert.equal(pulled.payload.hostname, "example.com");
  queue.close();
});

test("dropIfFull discards overflow instead of blocking", () => {
  const queue = new JobQueue({ maxSize: 2 });
  assert.ok(queue.enqueue("query.log", { n: 1 }, { dropIfFull: true }));
  assert.ok(queue.enqueue("query.log", { n: 2 }, { dropIfFull: true }));
  assert.equal(queue.enqueue("query.log", { n: 3 }, { dropIfFull: true }), null);
  assert.equal(queue.dropped, 1);
  assert.equal(queue.size, 2);
  queue.close();
});

test("close unblocks a waiting dequeue", async () => {
  const queue = new JobQueue();
  const pending = queue.dequeue();
  queue.close();
  assert.equal(await pending, null);
});

test("abort signal unblocks a waiting dequeue", async () => {
  const queue = new JobQueue();
  const abort = new AbortController();
  const pending = queue.dequeue(abort.signal);
  abort.abort();
  assert.equal(await pending, null);
  queue.close();
});
