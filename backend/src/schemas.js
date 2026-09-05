export const errorResponseSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
    message: { type: "string" },
    details: { type: "object" },
  },
  required: ["error", "message"],
};

const errorBody = {
  type: "object",
  properties: {
    error: { type: "string" },
    message: { type: "string" },
    details: { type: "object", additionalProperties: true },
  },
  required: ["error", "message"],
};

const errorResponses = {
  400: errorBody,
  404: errorBody,
  409: errorBody,
};

// POST /api/dns
export const addRecordSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["type", "hostname", "value"],
    properties: {
      type: { type: "string", minLength: 1, maxLength: 16 },
      hostname: { type: "string", minLength: 1, maxLength: 253 },
      value: { type: "string", minLength: 1, maxLength: 253 },
    },
  },
  response: {
    201: {
      type: "object",
      properties: {
        hostname: { type: "string" },
        type: { type: "string" },
        value: { type: "string" },
        createdAt: { type: "string" },
      },
    },
    ...errorResponses,
  },
};

export const hostnameParamsSchema = {
  type: "object",
  required: ["hostname"],
  properties: {
    hostname: { type: "string", minLength: 1 },
  },
};

// GET /api/dns/:hostname
export const resolveSchema = {
  params: hostnameParamsSchema,
  response: {
    200: {
      type: "object",
      properties: {
        hostname: { type: "string" },
        resolvedIps: { type: "array", items: { type: "string" } },
        recordType: { type: "string" },
        pointsTo: { type: ["string", "null"] },
      },
    },
    ...errorResponses,
  },
};

// GET /api/dns/:hostname/records
export const listRecordsSchema = {
  params: hostnameParamsSchema,
  response: {
    200: {
      type: "object",
      properties: {
        hostname: { type: "string" },
        records: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              value: { type: "string" },
            },
          },
        },
      },
    },
    ...errorResponses,
  },
};

// GET /api/analytics/queries
export const analyticsQueriesSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      hostname: { type: "string", minLength: 1 },
      limit: { type: "string" }, // parsed in the handler (coerceTypes is off)
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        queue: {
          type: "object",
          properties: {
            ready: { type: "integer" },
            enqueued: { type: "integer" },
            dequeued: { type: "integer" },
            dropped: { type: "integer" },
          },
        },
        total: { type: "integer" },
        stored: { type: "integer" },
        evicted: { type: "integer" },
        queries: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "integer" },
              at: { type: "string" },
              hostname: { type: "string" },
              found: { type: "boolean" },
              recordType: { type: ["string", "null"] },
              resolvedIps: { type: "array", items: { type: "string" } },
              pointsTo: { type: ["string", "null"] },
              error: { type: ["string", "null"] },
            },
          },
        },
      },
    },
    ...errorResponses,
  },
};

// DELETE /api/dns/:hostname
export const deleteRecordSchema = {
  params: hostnameParamsSchema,
  querystring: {
    type: "object",
    properties: {
      type: { type: "string" },
      value: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        message: { type: "string" },
        hostname: { type: "string" },
        type: { type: "string" },
        value: { type: "string" },
      },
    },
    ...errorResponses,
  },
};
