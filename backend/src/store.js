// In-memory repo: hostname -> DnsRecord[]. No database.
export class DnsStore {
  constructor() {
    this._records = new Map(); // hostname -> records
    this._rrCursor = new Map(); // hostname -> round-robin offset
  }

  listFor(hostname) {
    return [...(this._records.get(hostname) ?? [])];
  }

  add(record) {
    const existing = this._records.get(record.hostname);
    if (existing) {
      existing.push(record);
    } else {
      this._records.set(record.hostname, [record]);
    }
    return record;
  }

  delete(hostname, recordType, value) {
    const records = this._records.get(hostname);
    if (!records) {
      return null;
    }

    const index = records.findIndex(
      (record) => record.type === recordType && record.value === value,
    );
    if (index === -1) {
      return null;
    }

    const [removed] = records.splice(index, 1);
    if (records.length === 0) {
      this._records.delete(hostname);
      this._rrCursor.delete(hostname); // drop unused rotation state
    }
    return removed;
  }

  // Rotate A IPs on each resolve; listRecords does not rotate.
  rotateIps(hostname, ips) {
    if (ips.length <= 1) {
      return ips;
    }
    const cursor = this._rrCursor.get(hostname) ?? 0;
    const offset = cursor % ips.length;
    this._rrCursor.set(hostname, offset + 1);
    return ips.slice(offset).concat(ips.slice(0, offset));
  }

  clear() {
    this._records.clear();
    this._rrCursor.clear();
  }
}
