import { MAX_HOSTNAME_LENGTH, MAX_LABEL_LENGTH } from "./config.js";
import { DnsValidationError } from "./errors.js";

const LABEL_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/; // RFC 1123 label
const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

export function normalizeHostname(raw) {
  // Lowercase, strip trailing dots, RFC 1123 labels.
  if (raw == null || !String(raw).trim()) {
    throw new DnsValidationError("Hostname is required.");
  }

  const hostname = String(raw).trim().replace(/\.+$/, "").toLowerCase(); // strip trailing dots
  if (!hostname) {
    throw new DnsValidationError("Hostname is required.");
  }

  if (hostname.length > MAX_HOSTNAME_LENGTH) {
    throw new DnsValidationError(
      `Hostname exceeds maximum length of ${MAX_HOSTNAME_LENGTH} characters.`,
      { hostname, length: hostname.length },
    );
  }

  if (hostname.includes(" ")) {
    throw new DnsValidationError("Hostname must not contain spaces.", { hostname });
  }

  const labels = hostname.split(".");
  if (labels.some((label) => label === "")) {
    throw new DnsValidationError(
      "Hostname contains empty labels (consecutive or leading dots).",
      { hostname },
    );
  }

  for (const label of labels) {
    if (label.length > MAX_LABEL_LENGTH) {
      throw new DnsValidationError(
        `Hostname label '${label}' exceeds ${MAX_LABEL_LENGTH} characters.`,
        { hostname, label },
      );
    }
    if (!LABEL_RE.test(label)) {
      throw new DnsValidationError(
        "Hostname labels must start and end with an alphanumeric character and may contain hyphens in between (RFC 1123).",
        { hostname, label },
      );
    }
  }

  return hostname;
}

export function isIpv4(raw) {
  if (raw == null) {
    return false;
  }
  return IPV4_RE.test(String(raw).trim());
}

export function validateIpv4(raw) {
  if (raw == null || !String(raw).trim()) {
    throw new DnsValidationError("IPv4 address is required for A records.");
  }

  const value = String(raw).trim();
  if (!IPV4_RE.test(value)) {
    throw new DnsValidationError(`'${value}' is not a valid IPv4 address.`, { value });
  }

  return value;
}

export function validateRecordValue(recordType, value) {
  // A => IPv4; CNAME => hostname (not an IP).
  if (recordType === "A") {
    return validateIpv4(value);
  }
  if (recordType === "CNAME") {
    if (isIpv4(value)) {
      throw new DnsValidationError(
        "CNAME records must point to a hostname, not an IPv4 address.",
        { value: String(value).trim() },
      );
    }
    return normalizeHostname(value);
  }
  throw new DnsValidationError(
    `Unsupported record type '${recordType}'. Supported types: A, CNAME.`,
    { type: recordType },
  );
}

export function normalizeType(recordType) {
  const normalized = String(recordType ?? "").trim().toUpperCase();
  if (normalized !== "A" && normalized !== "CNAME") {
    throw new DnsValidationError(
      `Unsupported record type '${recordType}'. Supported types: A, CNAME.`,
      { type: recordType },
    );
  }
  return normalized;
}
