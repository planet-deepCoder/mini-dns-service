import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DnsConflictError,
  DnsCycleError,
  DnsNotFoundError,
  DnsValidationError,
} from "../src/errors.js";
import { MAX_CNAME_CHAIN_DEPTH } from "../src/config.js";
import { DnsRecord } from "../src/record.js";
import { DnsService } from "../src/service.js";
import { DnsStore } from "../src/store.js";

function createService() {
  return new DnsService(new DnsStore());
}

test("multiple A records are allowed on one hostname", () => {
  const service = createService();
  service.addRecord("A", "example.com", "192.168.1.1");
  service.addRecord("A", "example.com", "192.168.1.2");
  const listed = service.listRecords("example.com");
  const values = listed.records.map((record) => record.value).sort();
  assert.deepEqual(values, ["192.168.1.1", "192.168.1.2"]);
});

test("duplicate A records are rejected", () => {
  const service = createService();
  service.addRecord("A", "example.com", "192.168.1.1");
  assert.throws(() => service.addRecord("A", "example.com", "192.168.1.1"), /Duplicate/);
});

test("duplicate detection is case-insensitive on hostname", () => {
  const service = createService();
  service.addRecord("A", "Example.COM", "10.0.0.1");
  assert.throws(() => service.addRecord("A", "example.com", "10.0.0.1"), DnsConflictError);
});

test("CNAME cannot coexist with A records", () => {
  const service = createService();
  service.addRecord("A", "example.com", "192.168.1.1");
  assert.throws(
    () => service.addRecord("CNAME", "example.com", "other.com"),
    /cannot coexist/,
  );
});

test("A records cannot coexist with a CNAME", () => {
  const service = createService();
  service.addRecord("CNAME", "alias.example.com", "example.com");
  assert.throws(
    () => service.addRecord("A", "alias.example.com", "192.168.1.1"),
    /already has a CNAME/,
  );
});

test("only one CNAME per hostname", () => {
  const service = createService();
  service.addRecord("CNAME", "alias.example.com", "example.com");
  assert.throws(
    () => service.addRecord("CNAME", "alias.example.com", "other.com"),
    DnsConflictError,
  );
});

test("self-referential CNAME is rejected", () => {
  const service = createService();
  assert.throws(
    () => service.addRecord("CNAME", "loop.example.com", "loop.example.com"),
    /cannot point to itself/,
  );
});

test("CNAME cycle is detected on insert", () => {
  const service = createService();
  service.addRecord("CNAME", "a.example.com", "b.example.com");
  service.addRecord("CNAME", "b.example.com", "c.example.com");
  assert.throws(
    () => service.addRecord("CNAME", "c.example.com", "a.example.com"),
    DnsCycleError,
  );
});

test("resolve returns all A record IPs", () => {
  const service = createService();
  service.addRecord("A", "example.com", "192.168.1.1");
  service.addRecord("A", "example.com", "192.168.1.2");
  const result = service.resolve("example.com");
  assert.equal(result.recordType, "A");
  assert.equal(result.pointsTo, null);
  assert.deepEqual([...result.resolvedIps].sort(), ["192.168.1.1", "192.168.1.2"]);
});

test("resolve follows a CNAME to A records", () => {
  const service = createService();
  service.addRecord("A", "example.com", "192.168.1.1");
  service.addRecord("A", "example.com", "192.168.1.2");
  service.addRecord("CNAME", "alias.example.com", "example.com");
  const result = service.resolve("alias.example.com");
  assert.equal(result.recordType, "CNAME");
  assert.equal(result.pointsTo, "example.com");
  assert.deepEqual([...result.resolvedIps].sort(), ["192.168.1.1", "192.168.1.2"]);
});

test("resolve follows a CNAME chain and reports the immediate target", () => {
  const service = createService();
  service.addRecord("A", "example.com", "10.0.0.1");
  service.addRecord("CNAME", "blog.example.com", "example.com");
  service.addRecord("CNAME", "www.example.com", "blog.example.com");
  const result = service.resolve("www.example.com");
  assert.equal(result.pointsTo, "blog.example.com");
  assert.deepEqual(result.resolvedIps, ["10.0.0.1"]);
});

test("dangling CNAME resolves to an empty IP list", () => {
  const service = createService();
  service.addRecord("CNAME", "alias.example.com", "missing.example.com");
  const result = service.resolve("alias.example.com");
  assert.deepEqual(result.resolvedIps, []);
  assert.equal(result.pointsTo, "missing.example.com");
});

test("resolve unknown hostname", () => {
  const service = createService();
  assert.throws(() => service.resolve("no-such.example.com"), DnsNotFoundError);
});

test("list unknown hostname", () => {
  const service = createService();
  assert.throws(() => service.listRecords("no-such.example.com"), DnsNotFoundError);
});

test("deleting one A record leaves the others", () => {
  const service = createService();
  service.addRecord("A", "example.com", "192.168.1.1");
  service.addRecord("A", "example.com", "192.168.1.2");
  service.deleteRecord("example.com", "A", "192.168.1.1");
  const listed = service.listRecords("example.com");
  assert.deepEqual(listed.records, [{ type: "A", value: "192.168.1.2" }]);
});

test("delete missing record", () => {
  const service = createService();
  service.addRecord("A", "example.com", "192.168.1.1");
  assert.throws(() => service.deleteRecord("example.com", "A", "10.0.0.1"), DnsNotFoundError);
});

test("delete requires type and value", () => {
  const service = createService();
  assert.throws(() => service.deleteRecord("example.com", null, "192.168.1.1"), /type/);
  assert.throws(() => service.deleteRecord("example.com", "A", null), /value/);
});

test("invalid IPv4 is rejected", () => {
  const service = createService();
  assert.throws(() => service.addRecord("A", "example.com", "not-an-ip"), DnsValidationError);
});

test("record types are case-insensitive", () => {
  const service = createService();
  const record = service.addRecord("a", "Example.COM", "10.0.0.9");
  assert.equal(record.type, "A");
  assert.equal(record.hostname, "example.com");
});

test("CNAME target cannot be an IP address", () => {
  const service = createService();
  assert.throws(
    () => service.addRecord("CNAME", "alias.example.com", "192.168.1.1"),
    DnsValidationError,
  );
});

test("list records does not follow CNAMEs", () => {
  const service = createService();
  service.addRecord("A", "example.com", "10.0.0.1");
  service.addRecord("CNAME", "www.example.com", "example.com");
  assert.deepEqual(service.listRecords("www.example.com").records, [
    { type: "CNAME", value: "example.com" },
  ]);
});

test("successive resolves rotate A records (round-robin)", () => {
  const service = createService();
  service.addRecord("A", "example.com", "10.0.0.1");
  service.addRecord("A", "example.com", "10.0.0.2");
  service.addRecord("A", "example.com", "10.0.0.3");
  assert.deepEqual(service.resolve("example.com").resolvedIps, ["10.0.0.1", "10.0.0.2", "10.0.0.3"]);
  assert.deepEqual(service.resolve("example.com").resolvedIps, ["10.0.0.2", "10.0.0.3", "10.0.0.1"]);
  assert.deepEqual(service.resolve("example.com").resolvedIps, ["10.0.0.3", "10.0.0.1", "10.0.0.2"]);
});

test("list records keeps a stable A-record order", () => {
  const service = createService();
  service.addRecord("A", "example.com", "10.0.0.1");
  service.addRecord("A", "example.com", "10.0.0.2");
  service.resolve("example.com");
  assert.deepEqual(
    service.listRecords("example.com").records.map((record) => record.value),
    ["10.0.0.1", "10.0.0.2"],
  );
});

test("resolve detects a CNAME cycle already in the store", () => {
  const store = new DnsStore();
  const now = new Date();
  store.add(
    new DnsRecord({
      hostname: "a.example.com",
      type: "CNAME",
      value: "b.example.com",
      createdAt: now,
    }),
  );
  store.add(
    new DnsRecord({
      hostname: "b.example.com",
      type: "CNAME",
      value: "a.example.com",
      createdAt: now,
    }),
  );
  const service = new DnsService(store);
  assert.throws(() => service.resolve("a.example.com"), DnsCycleError);
});

test("CNAME chain deeper than the cap is rejected on insert", () => {
  const service = createService();
  service.addRecord("A", "leaf.example.com", "10.0.0.1");
  let next = "leaf.example.com";
  for (let i = 0; i < MAX_CNAME_CHAIN_DEPTH; i++) {
    const hostname = `h${i}.example.com`;
    service.addRecord("CNAME", hostname, next);
    next = hostname;
  }
  assert.throws(
    () => service.addRecord("CNAME", "too-deep.example.com", next),
    DnsCycleError,
  );
});

test("deleting a CNAME frees the hostname for A records", () => {
  const service = createService();
  service.addRecord("CNAME", "alias.example.com", "example.com");
  service.deleteRecord("alias.example.com", "CNAME", "example.com");
  const record = service.addRecord("A", "alias.example.com", "10.0.0.1");
  assert.equal(record.type, "A");
});
