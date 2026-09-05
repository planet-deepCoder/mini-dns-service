import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import { buildApp } from "../src/app.js";

async function createApp(t) {
  const app = await buildApp({ logger: false });
  t.after(() => app.close());
  return app;
}

test("health", async (t) => {
  const app = await createApp(t);
  const response = await app.inject({ method: "GET", url: "/health" });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: "ok" });
});

test("add A record", async (t) => {
  const app = await createApp(t);
  const response = await app.inject({
    method: "POST",
    url: "/api/dns",
    payload: { type: "A", hostname: "example.com", value: "192.168.1.1" },
  });
  assert.equal(response.statusCode, 201);
  const body = response.json();
  assert.equal(body.hostname, "example.com");
  assert.equal(body.type, "A");
  assert.equal(body.value, "192.168.1.1");
  assert.ok(body.createdAt);
});

test("add CNAME record", async (t) => {
  const app = await createApp(t);
  const response = await app.inject({
    method: "POST",
    url: "/api/dns",
    payload: { type: "CNAME", hostname: "alias.example.com", value: "example.com" },
  });
  assert.equal(response.statusCode, 201);
  const body = response.json();
  assert.equal(body.type, "CNAME");
  assert.equal(body.value, "example.com");
});

test("resolve CNAME with multiple A targets", async (t) => {
  const app = await createApp(t);
  await app.inject({
    method: "POST",
    url: "/api/dns",
    payload: { type: "A", hostname: "example.com", value: "192.168.1.1" },
  });
  await app.inject({
    method: "POST",
    url: "/api/dns",
    payload: { type: "A", hostname: "example.com", value: "192.168.1.2" },
  });
  await app.inject({
    method: "POST",
    url: "/api/dns",
    payload: { type: "CNAME", hostname: "alias.example.com", value: "example.com" },
  });

  const response = await app.inject({ method: "GET", url: "/api/dns/alias.example.com" });
  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.hostname, "alias.example.com");
  assert.equal(body.recordType, "CNAME");
  assert.equal(body.pointsTo, "example.com");
  assert.deepEqual([...body.resolvedIps].sort(), ["192.168.1.1", "192.168.1.2"]);
});

test("list records", async (t) => {
  const app = await createApp(t);
  await app.inject({
    method: "POST",
    url: "/api/dns",
    payload: { type: "A", hostname: "example.com", value: "192.168.1.1" },
  });
  await app.inject({
    method: "POST",
    url: "/api/dns",
    payload: { type: "A", hostname: "example.com", value: "192.168.1.2" },
  });
  const response = await app.inject({ method: "GET", url: "/api/dns/example.com/records" });
  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.hostname, "example.com");
  assert.equal(body.records.length, 2);
});

test("delete record", async (t) => {
  const app = await createApp(t);
  await app.inject({
    method: "POST",
    url: "/api/dns",
    payload: { type: "A", hostname: "example.com", value: "192.168.1.1" },
  });
  const response = await app.inject({
    method: "DELETE",
    url: "/api/dns/example.com?type=A&value=192.168.1.1",
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().message, "DNS record deleted.");

  const missing = await app.inject({ method: "GET", url: "/api/dns/example.com" });
  assert.equal(missing.statusCode, 404);
});

test("delete missing query params", async (t) => {
  const app = await createApp(t);
  const response = await app.inject({ method: "DELETE", url: "/api/dns/example.com" });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, "VALIDATION_ERROR");
});

test("conflict between CNAME and A", async (t) => {
  const app = await createApp(t);
  await app.inject({
    method: "POST",
    url: "/api/dns",
    payload: { type: "A", hostname: "example.com", value: "192.168.1.1" },
  });
  const response = await app.inject({
    method: "POST",
    url: "/api/dns",
    payload: { type: "CNAME", hostname: "example.com", value: "other.com" },
  });
  assert.equal(response.statusCode, 409);
  assert.equal(response.json().error, "CONFLICT");
});

test("duplicate records are rejected", async (t) => {
  const app = await createApp(t);
  const payload = { type: "A", hostname: "example.com", value: "192.168.1.1" };
  assert.equal((await app.inject({ method: "POST", url: "/api/dns", payload })).statusCode, 201);
  const response = await app.inject({ method: "POST", url: "/api/dns", payload });
  assert.equal(response.statusCode, 409);
});

test("invalid hostname", async (t) => {
  const app = await createApp(t);
  const response = await app.inject({
    method: "POST",
    url: "/api/dns",
    payload: { type: "A", hostname: "-bad.com", value: "192.168.1.1" },
  });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, "VALIDATION_ERROR");
});

test("invalid IPv4", async (t) => {
  const app = await createApp(t);
  const response = await app.inject({
    method: "POST",
    url: "/api/dns",
    payload: { type: "A", hostname: "example.com", value: "999.1.1.1" },
  });
  assert.equal(response.statusCode, 400);
});

test("circular CNAME", async (t) => {
  const app = await createApp(t);
  await app.inject({
    method: "POST",
    url: "/api/dns",
    payload: { type: "CNAME", hostname: "a.example.com", value: "b.example.com" },
  });
  const response = await app.inject({
    method: "POST",
    url: "/api/dns",
    payload: { type: "CNAME", hostname: "b.example.com", value: "a.example.com" },
  });
  assert.equal(response.statusCode, 409);
  assert.equal(response.json().error, "CNAME_CYCLE");
});

test("resolve not found", async (t) => {
  const app = await createApp(t);
  const response = await app.inject({ method: "GET", url: "/api/dns/missing.example.com" });
  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error, "NOT_FOUND");
});

test("malformed body", async (t) => {
  const app = await createApp(t);
  const response = await app.inject({
    method: "POST",
    url: "/api/dns",
    payload: { type: "A" },
  });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, "VALIDATION_ERROR");
});

test("lowercase record type is accepted", async (t) => {
  const app = await createApp(t);
  const response = await app.inject({
    method: "POST",
    url: "/api/dns",
    payload: { type: "a", hostname: "example.com", value: "10.0.0.1" },
  });
  assert.equal(response.statusCode, 201);
  assert.equal(response.json().type, "A");
});

test("CNAME to an IPv4 address is rejected", async (t) => {
  const app = await createApp(t);
  const response = await app.inject({
    method: "POST",
    url: "/api/dns",
    payload: { type: "CNAME", hostname: "alias.example.com", value: "192.168.1.1" },
  });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, "VALIDATION_ERROR");
});

test("unsupported record type is rejected", async (t) => {
  const app = await createApp(t);
  const response = await app.inject({
    method: "POST",
    url: "/api/dns",
    payload: { type: "MX", hostname: "example.com", value: "mail.example.com" },
  });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, "VALIDATION_ERROR");
});

test("unknown body fields such as ttl are rejected", async (t) => {
  const app = await createApp(t);
  const response = await app.inject({
    method: "POST",
    url: "/api/dns",
    payload: { type: "A", hostname: "example.com", value: "10.0.0.1", ttl: 30 },
  });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, "VALIDATION_ERROR");
});

test("list records 404", async (t) => {
  const app = await createApp(t);
  const response = await app.inject({
    method: "GET",
    url: "/api/dns/missing.example.com/records",
  });
  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error, "NOT_FOUND");
});

test("resolve treats trailing-dot hostnames as the same name", async (t) => {
  const app = await createApp(t);
  await app.inject({
    method: "POST",
    url: "/api/dns",
    payload: { type: "A", hostname: "example.com.", value: "10.0.0.1" },
  });
  const response = await app.inject({ method: "GET", url: "/api/dns/Example.COM" });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().resolvedIps, ["10.0.0.1"]);
});

test("query logs appear asynchronously after resolve", async (t) => {
  const app = await createApp(t);
  await app.inject({
    method: "POST",
    url: "/api/dns",
    payload: { type: "A", hostname: "example.com", value: "192.168.1.1" },
  });
  const resolved = await app.inject({ method: "GET", url: "/api/dns/example.com" });
  assert.equal(resolved.statusCode, 200);

  await waitUntil(() => app.queryLogs.entries.length >= 1);

  const response = await app.inject({ method: "GET", url: "/api/analytics/queries" });
  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.ok(body.total >= 1);
  assert.ok(body.queue.enqueued >= 1);
  assert.equal(body.queries[0].hostname, "example.com");
  assert.equal(body.queries[0].found, true);
  assert.deepEqual(body.queries[0].resolvedIps, ["192.168.1.1"]);
});

test("analytics rejects an invalid limit", async (t) => {
  const app = await createApp(t);
  const response = await app.inject({ method: "GET", url: "/api/analytics/queries?limit=0" });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, "VALIDATION_ERROR");
});

async function waitUntil(predicate, timeoutMs = 1000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) {
      return;
    }
    await delay(15);
  }
  throw new Error("timed out waiting for background job");
}
