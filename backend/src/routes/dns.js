import {
  addRecordSchema,
  deleteRecordSchema,
  listRecordsSchema,
  resolveSchema,
} from "../schemas.js";

export default async function dnsRoutes(fastify) {
  const { dnsService } = fastify;

  // Create an A or CNAME record.
  fastify.post("/api/dns", { schema: addRecordSchema }, async (request, reply) => {
    const { type, hostname, value } = request.body;
    const record = dnsService.addRecord(type, hostname, value);
    return reply.code(201).send(record.toResponse());
  });

  // List records at this hostname only (no CNAME follow).
  fastify.get(
    "/api/dns/:hostname/records",
    { schema: listRecordsSchema },
    async (request) => dnsService.listRecords(request.params.hostname),
  );

  // Resolve hostname; follows CNAME chains and enqueues a query log.
  fastify.get("/api/dns/:hostname", { schema: resolveSchema }, async (request) =>
    dnsService.resolve(request.params.hostname),
  );

  // Delete one (hostname, type, value) tuple.
  fastify.delete("/api/dns/:hostname", { schema: deleteRecordSchema }, async (request) => {
    const record = dnsService.deleteRecord(
      request.params.hostname,
      request.query.type,
      request.query.value,
    );
    return {
      message: "DNS record deleted.",
      hostname: record.hostname,
      type: record.type,
      value: record.value,
    };
  });
}
