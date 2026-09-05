// Domain errors mapped to HTTP status + stable error codes.
export class DnsError extends Error {
  constructor(message, { statusCode = 400, errorCode = "DNS_ERROR", details } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details ?? {};
  }

  toJSON() {
    const payload = { error: this.errorCode, message: this.message };
    if (this.details && Object.keys(this.details).length > 0) {
      payload.details = this.details; // omit empty details
    }
    return payload;
  }
}

export class DnsValidationError extends DnsError {
  constructor(message, details) {
    super(message, { statusCode: 400, errorCode: "VALIDATION_ERROR", details });
  }
}

export class DnsNotFoundError extends DnsError {
  constructor(message, details) {
    super(message, { statusCode: 404, errorCode: "NOT_FOUND", details });
  }
}

export class DnsConflictError extends DnsError {
  constructor(message, details) {
    super(message, { statusCode: 409, errorCode: "CONFLICT", details });
  }
}

export class DnsCycleError extends DnsError {
  constructor(message, details) {
    super(message, { statusCode: 409, errorCode: "CNAME_CYCLE", details });
  }
}
