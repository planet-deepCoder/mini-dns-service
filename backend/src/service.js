import { MAX_CNAME_CHAIN_DEPTH } from "./config.js";
import {
  DnsConflictError,
  DnsCycleError,
  DnsNotFoundError,
  DnsValidationError,
} from "./errors.js";
import { DnsRecord } from "./record.js";
import { normalizeHostname, normalizeType, validateRecordValue } from "./validators.js";

// DNS rules live here; HTTP routes only call these methods.
export class DnsService {
  constructor(store, { queue } = {}) {
    this.store = store;
    this.queue = queue ?? null; // optional; tests can omit logging
  }

  addRecord(recordType, hostname, value) {
    hostname = normalizeHostname(hostname);
    recordType = normalizeType(recordType);
    value = validateRecordValue(recordType, value);

    if (recordType === "CNAME" && value === hostname) {
      throw new DnsCycleError("A CNAME record cannot point to itself.", {
        hostname,
        value,
      });
    }

    const existing = this.store.listFor(hostname);
    this._assertNoConflicts(hostname, recordType, value, existing);

    if (recordType === "CNAME") {
      this._assertNoCycle(hostname, value); // walk targets before insert
    }

    const record = new DnsRecord({
      hostname,
      type: recordType,
      value,
      createdAt: new Date(),
    });
    this.store.add(record);
    return record;
  }

  resolve(hostname) {
    hostname = normalizeHostname(hostname);
    try {
      const result = this._resolve(hostname);
      this._logQuery({
        hostname,
        found: true,
        recordType: result.recordType,
        resolvedIps: result.resolvedIps,
        pointsTo: result.pointsTo,
        error: null,
      });
      return result;
    } catch (error) {
      this._logQuery({
        hostname,
        found: false,
        recordType: null,
        resolvedIps: [],
        pointsTo: null,
        error: error.errorCode ?? error.name,
      });
      throw error; // log miss/cycle then rethrow for HTTP mapping
    }
  }

  _resolve(hostname) {
    const records = this.store.listFor(hostname);
    if (records.length === 0) {
      throw new DnsNotFoundError(`No DNS records found for hostname '${hostname}'.`, {
        hostname,
      });
    }

    const cname = findCname(records);
    if (cname) {
      const { resolvedIps } = this._followCnameChain(cname.value);
      return {
        hostname,
        resolvedIps,
        recordType: "CNAME",
        pointsTo: cname.value, // immediate target, not the canonical name
      };
    }

    return {
      hostname,
      resolvedIps: this.store.rotateIps(
        hostname,
        records.filter((record) => record.type === "A").map((record) => record.value),
      ),
      recordType: "A",
      pointsTo: null,
    };
  }

  listRecords(hostname) {
    hostname = normalizeHostname(hostname);
    const records = this.store.listFor(hostname);
    if (records.length === 0) {
      throw new DnsNotFoundError(`No DNS records found for hostname '${hostname}'.`, {
        hostname,
      });
    }
    return {
      hostname,
      records: records.map((record) => ({ type: record.type, value: record.value })),
    };
  }

  deleteRecord(hostname, recordType, value) {
    hostname = normalizeHostname(hostname);
    if (recordType == null || !String(recordType).trim()) {
      throw new DnsValidationError("Query parameter 'type' is required (A or CNAME).", {
        hostname,
      });
    }
    if (value == null || !String(value).trim()) {
      throw new DnsValidationError("Query parameter 'value' is required.", {
        hostname,
        type: recordType,
      });
    }

    recordType = normalizeType(recordType);
    value = validateRecordValue(recordType, value);

    const removed = this.store.delete(hostname, recordType, value);
    if (removed == null) {
      throw new DnsNotFoundError(
        `No ${recordType} record with value '${value}' found for '${hostname}'.`,
        { hostname, type: recordType, value },
      );
    }
    return removed;
  }

  _logQuery(entry) {
    this._enqueue(
      "query.log",
      { ...entry, at: new Date().toISOString() },
      { dropIfFull: true }, // never block resolve if the queue is full
    );
  }

  _enqueue(type, payload, options) {
    if (!this.queue) {
      return;
    }
    try {
      this.queue.enqueue(type, payload, options);
    } catch {
      // ignore queue errors so DNS still succeeds
    }
  }

  _assertNoConflicts(hostname, recordType, value, existing) {
    if (existing.length === 0) {
      return;
    }

    const existingTypes = new Set(existing.map((record) => record.type));

    if (existing.some((record) => record.type === recordType && record.value === value)) {
      throw new DnsConflictError(
        `Duplicate ${recordType} record for '${hostname}' with value '${value}'.`,
        { hostname, type: recordType, value },
      );
    }

    if (recordType === "CNAME") {
      throw new DnsConflictError(
        `Hostname '${hostname}' already has records; a CNAME cannot coexist with other records.`,
        { hostname, existingTypes: [...existingTypes].sort() },
      );
    }

    if (existingTypes.has("CNAME")) {
      throw new DnsConflictError(
        `Hostname '${hostname}' already has a CNAME record; A records cannot coexist with CNAME.`,
        { hostname, existingType: "CNAME" },
      );
    }
  }

  _assertNoCycle(hostname, target) {
    const seen = [hostname];
    let current = target;
    let depth = 0;

    while (current) {
      if (seen.includes(current)) {
        throw new DnsCycleError("CNAME record would create a circular reference.", {
          hostname,
          target,
          chain: [...seen, current].join(" -> "),
        });
      }
      if (depth >= MAX_CNAME_CHAIN_DEPTH) {
        throw new DnsCycleError(
          `CNAME chain exceeds maximum depth of ${MAX_CNAME_CHAIN_DEPTH}.`,
          { hostname, target, depth },
        );
      }

      seen.push(current);
      const records = this.store.listFor(current);
      const cname = findCname(records);
      if (cname == null) {
        return; // chain ends at A records or a dangling name
      }
      current = cname.value;
      depth += 1;
    }
  }

  _followCnameChain(start) {
    const seen = [];
    let current = start;
    let depth = 0;

    while (true) {
      if (seen.includes(current)) {
        throw new DnsCycleError("Circular CNAME reference detected during resolution.", {
          chain: [...seen, current].join(" -> "),
        });
      }
      if (depth >= MAX_CNAME_CHAIN_DEPTH) {
        throw new DnsCycleError(
          `CNAME chain exceeds maximum depth of ${MAX_CNAME_CHAIN_DEPTH}.`,
          { hostname: start, depth },
        );
      }

      seen.push(current);
      const records = this.store.listFor(current);
      if (records.length === 0) {
        return { resolvedIps: [], canonical: current }; // dangling CNAME
      }

      const cname = findCname(records);
      if (cname) {
        current = cname.value;
        depth += 1;
        continue;
      }

      return {
        resolvedIps: this.store.rotateIps(
          current,
          records.filter((record) => record.type === "A").map((record) => record.value),
        ),
        canonical: current,
      };
    }
  }
}

function findCname(records) {
  return records.find((record) => record.type === "CNAME") ?? null;
}
