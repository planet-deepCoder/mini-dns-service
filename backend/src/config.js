export const MAX_CNAME_CHAIN_DEPTH = 10; // stop infinite CNAME walks
export const MAX_HOSTNAME_LENGTH = 253; // RFC 1035 hostname cap
export const MAX_LABEL_LENGTH = 63; // RFC 1035 label cap

export const QUEUE_MAX_SIZE = Number(process.env.DNS_QUEUE_MAX ?? 10_000); // query-log backpressure
export const WORKER_CONCURRENCY = Number(process.env.DNS_WORKER_CONCURRENCY ?? 1); // background drain loops
export const QUERY_LOG_MAX_ENTRIES = Number(process.env.DNS_QUERY_LOG_MAX ?? 10_000); // ring-buffer size
export const PORT = Number(process.env.PORT ?? 8000);
export const HOST = process.env.HOST ?? "127.0.0.1";
