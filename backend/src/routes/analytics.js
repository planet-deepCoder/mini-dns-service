import { analyticsQueriesSchema } from "../schemas.js";
import { DnsValidationError } from "../errors.js";
import { normalizeHostname } from "../validators.js";

export default async function analyticsRoutes(fastify) {
  // Snapshot of drained query logs plus live queue stats.
  fastify.get("/api/analytics/queries", { schema: analyticsQueriesSchema }, async (request) => {
    const { hostname, limit: rawLimit } = request.query;
    const limit = parseLimit(rawLimit);
    const filter = hostname ? normalizeHostname(hostname) : undefined;

    return {
      queue: fastify.jobQueue.stats(),
      ...fastify.queryLogs.list({ hostname: filter, limit }),
    };
  });
}

function parseLimit(rawLimit) {
  if (rawLimit == null || rawLimit === "") {
    return 100;
  }
  const limit = Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    throw new DnsValidationError("Query parameter 'limit' must be an integer from 1 to 1000.", {
      limit: rawLimit,
    });
  }
  return limit;
}
