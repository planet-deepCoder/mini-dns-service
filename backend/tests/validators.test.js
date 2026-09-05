import assert from "node:assert/strict";
import { test } from "node:test";

import { DnsValidationError } from "../src/errors.js";
import { MAX_HOSTNAME_LENGTH } from "../src/config.js";
import { normalizeHostname, validateIpv4, validateRecordValue } from "../src/validators.js";

test("normalizeHostname lowercases and strips trailing dots", () => {
  assert.equal(normalizeHostname("Example.COM."), "example.com");
});

test("normalizeHostname rejects empty", () => {
  assert.throws(() => normalizeHostname("   "), DnsValidationError);
});

test("normalizeHostname rejects spaces", () => {
  assert.throws(() => normalizeHostname("exa mple.com"), /spaces/);
});

test("normalizeHostname rejects leading hyphen", () => {
  assert.throws(() => normalizeHostname("-example.com"), /RFC 1123/);
});

test("normalizeHostname rejects empty labels", () => {
  assert.throws(() => normalizeHostname("example..com"), /empty labels/);
});

test("normalizeHostname rejects overlong label", () => {
  const label = "a".repeat(64);
  assert.throws(() => normalizeHostname(`${label}.com`), /exceeds 63/);
});

test("normalizeHostname accepts a single label", () => {
  assert.equal(normalizeHostname("localhost"), "localhost");
});

test("normalizeHostname rejects a trailing hyphen in a label", () => {
  assert.throws(() => normalizeHostname("example-.com"), /RFC 1123/);
});

test("normalizeHostname rejects names longer than 253 characters", () => {
  const hostname = `${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(63)}`;
  assert.ok(hostname.length > MAX_HOSTNAME_LENGTH);
  assert.throws(() => normalizeHostname(hostname), /maximum length/);
});

test("normalizeHostname rejects wildcards", () => {
  assert.throws(() => normalizeHostname("*.example.com"), /RFC 1123/);
});

test("normalizeHostname strips a trailing FQDN dot", () => {
  assert.equal(normalizeHostname("www.example.com."), "www.example.com");
});

test("validateIpv4 accepts a valid address", () => {
  assert.equal(validateIpv4("192.168.1.1"), "192.168.1.1");
});

test("validateIpv4 rejects out of range octets", () => {
  assert.throws(() => validateIpv4("192.168.1.256"), /not a valid IPv4/);
});

test("validateIpv4 rejects IPv6", () => {
  assert.throws(() => validateIpv4("2001:db8::1"), /not a valid IPv4/);
});

test("CNAME value must be a hostname", () => {
  assert.throws(() => validateRecordValue("CNAME", "not_a_hostname!"), DnsValidationError);
});

test("CNAME value cannot be an IPv4 address", () => {
  assert.throws(
    () => validateRecordValue("CNAME", "192.168.1.1"),
    /not an IPv4 address/,
  );
});

test("unknown record types are rejected", () => {
  assert.throws(() => validateRecordValue("MX", "mail.example.com"), /Unsupported/);
});
