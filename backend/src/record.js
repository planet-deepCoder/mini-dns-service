// One in-memory DNS row (A or CNAME).
export class DnsRecord {
  constructor({ hostname, type, value, createdAt }) {
    this.hostname = hostname;
    this.type = type;
    this.value = value;
    this.createdAt = createdAt;
  }

  toResponse() {
    return {
      hostname: this.hostname,
      type: this.type,
      value: this.value,
      createdAt: this.createdAt.toISOString(),
    };
  }
}
