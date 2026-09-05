// Ring buffer of query logs; HTTP never writes here directly.
export class QueryLogStore {
  constructor({ maxEntries = 10_000 } = {}) {
    this.maxEntries = maxEntries;
    this.entries = [];
    this._nextId = 1;
    this.accepted = 0;
    this.evicted = 0;
  }

  append(entry) {
    if (this.entries.length >= this.maxEntries) {
      this.entries.shift(); // drop oldest
      this.evicted += 1;
    }
    this.entries.push({
      id: this._nextId++,
      ...entry,
    });
    this.accepted += 1;
    return this.entries[this.entries.length - 1];
  }

  list({ hostname, limit = 100 } = {}) {
    let queries = this.entries;
    if (hostname) {
      queries = queries.filter((entry) => entry.hostname === hostname);
    }
    const capped = Math.min(Math.max(1, limit), 1000);
    return {
      total: this.accepted,
      stored: this.entries.length,
      evicted: this.evicted,
      queries: queries.slice(-capped).reverse(), // newest first
    };
  }
}
