# Mini DNS Service

A simplified yet realistic DNS record API. Hostnames can map to one or more IPv4 **A** records, or to a single **CNAME** alias. The service enforces real DNS coexistence rules, follows CNAME chains on resolve, and rejects cycles.

Built with **Node.js** and **Fastify**.

> **AI:** Cursor agent (not in-line completion). All `src/` and `tests/` code is AI-generated. Backend chat history only: [AI_CHAT_HISTORY.md](AI_CHAT_HISTORY.md) and [ai-chat-history/](ai-chat-history/). The web app has its own history under `web/`. See [AI tool usage](#ai-tool-usage).

**Senior async processing:** DNS query logging — every resolve is enqueued as a `query.log` job so analytics never sits on the request path (details below). TTL expiration and health-check failover were not implemented; the assignment asked for one async feature.

This README covers:

1. [Setup instructions](#setup)
2. [Endpoints with examples](#endpoints)
3. [Reasoning behind implementation decisions](#implementation-decisions)
4. [AI tool usage](#ai-tool-usage)

## Setup

### Prerequisites

- **Node.js 20.11+** (includes `npm`)
- macOS, Linux, or Windows

Check the version:

```bash
node -v
```

### Install

From the repository root:

```bash
cd backend
npm install
```

### Run the API

Default listen address: **http://127.0.0.1:8000**

```bash
npm start
```

Watch mode (restarts on file changes):

```bash
npm run dev
```

Confirm the process is up:

```bash
curl -s http://127.0.0.1:8000/health
# {"status":"ok"}
```

Stop the server with Ctrl+C. The store is **in-memory**: a restart clears all records and query logs.

### Run tests

```bash
cd backend
npm test
```

Uses Node’s built-in test runner (`node --test`). No extra test framework to install.

### Postman

Import [`postman/Mini-DNS-Service.postman_collection.json`](postman/Mini-DNS-Service.postman_collection.json) (**File → Import**). Collection variable `baseUrl` defaults to `http://127.0.0.1:8000`. Folders are ordered so **Run collection** covers the happy path, analytics, validation errors, and deletes. Each request includes a status-code test.

### Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8000` | Listen port |
| `HOST` | `127.0.0.1` | Bind address |
| `DNS_QUEUE_MAX` | `10000` | Soft cap on queued `query.log` jobs. Overflow is dropped so resolve is never stalled. |
| `DNS_WORKER_CONCURRENCY` | `1` | Number of background workers draining the queue |
| `DNS_QUERY_LOG_MAX` | `10000` | Ring-buffer size for persisted query logs |

Example:

```bash
PORT=9000 npm start
```

## Endpoints

Base URL in the examples: `http://127.0.0.1:8000`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness check |
| `POST` | `/api/dns` | Add an A or CNAME record |
| `GET` | `/api/dns/{hostname}` | Resolve a hostname (follows CNAMEs) |
| `GET` | `/api/dns/{hostname}/records` | List records at that hostname only |
| `DELETE` | `/api/dns/{hostname}?type=&value=` | Delete one specific record |
| `GET` | `/api/analytics/queries` | Async query-log snapshot (senior feature) |

Error bodies always look like:

```json
{
  "error": "VALIDATION_ERROR | NOT_FOUND | CONFLICT | CNAME_CYCLE",
  "message": "Human-readable explanation",
  "details": {}
}
```

`details` is omitted when empty.

### Health

`GET /health`

```bash
curl -s http://127.0.0.1:8000/health
```

```json
{ "status": "ok" }
```

### Add DNS Record

`POST /api/dns`

Creates an A or CNAME record.

**Request body**

| Field | Required | Description |
| --- | --- | --- |
| `type` | yes | `A` or `CNAME` (case-insensitive) |
| `hostname` | yes | RFC 1123 hostname (trailing dots stripped, lowercased) |
| `value` | yes | IPv4 address for `A`; hostname for `CNAME` (not an IP) |

Unknown fields (including `ttl`) are rejected.

**A record**

```bash
curl -s -X POST http://127.0.0.1:8000/api/dns \
  -H 'Content-Type: application/json' \
  -d '{"type":"A","hostname":"example.com","value":"192.168.1.1"}'
```

```json
{
  "hostname": "example.com",
  "type": "A",
  "value": "192.168.1.1",
  "createdAt": "2026-09-05T01:20:00.123Z"
}
```

A second A record on the same name is allowed:

```bash
curl -s -X POST http://127.0.0.1:8000/api/dns \
  -H 'Content-Type: application/json' \
  -d '{"type":"A","hostname":"example.com","value":"192.168.1.2"}'
```

**CNAME record**

```bash
curl -s -X POST http://127.0.0.1:8000/api/dns \
  -H 'Content-Type: application/json' \
  -d '{"type":"CNAME","hostname":"alias.example.com","value":"example.com"}'
```

```json
{
  "hostname": "alias.example.com",
  "type": "CNAME",
  "value": "example.com",
  "createdAt": "2026-09-05T01:20:01.123Z"
}
```

| Status | When |
| --- | --- |
| 201 | Record created |
| 400 | Invalid hostname, IP, type, or body |
| 409 | Duplicate, CNAME/A conflict, or CNAME cycle |

**Conflict example** (CNAME on a name that already has A records):

```bash
curl -s -X POST http://127.0.0.1:8000/api/dns \
  -H 'Content-Type: application/json' \
  -d '{"type":"CNAME","hostname":"example.com","value":"other.com"}'
```

```json
{
  "error": "CONFLICT",
  "message": "Hostname 'example.com' already has records; a CNAME cannot coexist with other records.",
  "details": { "hostname": "example.com", "existingTypes": ["A"] }
}
```

### Resolve Hostname

`GET /api/dns/{hostname}`

Returns the queried hostname's record type. For CNAMEs, `pointsTo` is the immediate target and `resolvedIps` is collected by following the chain to A records.

Each resolve is also enqueued as a `query.log` job so analytics I/O never sits on the request path.

```bash
curl -s http://127.0.0.1:8000/api/dns/alias.example.com
```

```json
{
  "hostname": "alias.example.com",
  "resolvedIps": ["192.168.1.1", "192.168.1.2"],
  "recordType": "CNAME",
  "pointsTo": "example.com"
}
```

A-record example:

```bash
curl -s http://127.0.0.1:8000/api/dns/example.com
```

```json
{
  "hostname": "example.com",
  "resolvedIps": ["192.168.1.1", "192.168.1.2"],
  "recordType": "A",
  "pointsTo": null
}
```

| Status | When |
| --- | --- |
| 200 | Hostname exists (IPs may be empty if a CNAME is dangling) |
| 400 | Invalid hostname |
| 404 | No records for that hostname |
| 409 | Cycle discovered while following CNAMEs |

**Not found example:**

```bash
curl -s http://127.0.0.1:8000/api/dns/missing.example.com
```

```json
{
  "error": "NOT_FOUND",
  "message": "No DNS records found for hostname 'missing.example.com'.",
  "details": { "hostname": "missing.example.com" }
}
```

### List DNS Records for Hostname

`GET /api/dns/{hostname}/records`

Lists records **at that hostname only** (does not follow CNAMEs).

```bash
curl -s http://127.0.0.1:8000/api/dns/example.com/records
```

```json
{
  "hostname": "example.com",
  "records": [
    {"type": "A", "value": "192.168.1.1"},
    {"type": "A", "value": "192.168.1.2"}
  ]
}
```

| Status | When |
| --- | --- |
| 200 | Hostname has at least one record |
| 404 | No records |

### Delete DNS Record

`DELETE /api/dns/{hostname}?type=A&value=192.168.1.1`

Deletes one specific record. `type` and `value` are required.

```bash
curl -s -X DELETE 'http://127.0.0.1:8000/api/dns/example.com?type=A&value=192.168.1.1'
```

```json
{
  "message": "DNS record deleted.",
  "hostname": "example.com",
  "type": "A",
  "value": "192.168.1.1"
}
```

| Status | When |
| --- | --- |
| 200 | Record deleted |
| 400 | Missing/invalid `type` or `value` |
| 404 | No matching record |

### Query analytics (async log drain)

`GET /api/analytics/queries?hostname=&limit=`

Returns recently processed DNS query logs plus live job-queue stats. `limit` defaults to 100 (max 1000). `hostname` is an optional filter.

```bash
curl -s 'http://127.0.0.1:8000/api/analytics/queries?limit=20'
```

```json
{
  "queue": {
    "ready": 0,
    "enqueued": 4,
    "dequeued": 3,
    "dropped": 0
  },
  "total": 3,
  "stored": 3,
  "evicted": 0,
  "queries": [
    {
      "id": 3,
      "at": "2026-09-05T02:15:01.001Z",
      "hostname": "example.com",
      "found": true,
      "recordType": "A",
      "resolvedIps": ["192.168.1.1"],
      "pointsTo": null,
      "error": null
    }
  ]
}
```

| Status | When |
| --- | --- |
| 200 | Snapshot of queue + logs |
| 400 | Invalid `hostname` or `limit` |

## Asynchronous processing: DNS query logging

As the requirement is **one** async feature. This service implements **DNS query logging**: every hostname resolve is recorded for analytics **without adding latency** to the DNS response.

TTL expiration and health-check failover were not implemented. Query logging is the feature that matches high-volume, “do not block the request” work.

```
GET /api/dns/{hostname}          DnsService.resolve()
        |
        |  1. compute the DNS answer (sync)
        |  2. enqueue("query.log") — synchronous, no await
        |  3. return HTTP 200 / 404 immediately
        v
   JobQueue  (in-process FIFO, max DNS_QUEUE_MAX)
        |
        |  worker.dequeue() waits until a job is ready
        |  (event-driven — no polling timer)
        v
   Background worker(s)          DNS_WORKER_CONCURRENCY loops
        |
        |  handler "query.log"
        v
   QueryLogStore                 bounded ring buffer
        |
        v
   GET /api/analytics/queries    read-only snapshot
```

### Why this shape

A DNS resolve is the hot path. Writing analytics inline (even to memory) couples answer latency to log volume. The split is:

| Path | What it does | What it must not do |
| --- | --- | --- |
| **Request** | Resolve the name, enqueue a job, return | Wait for the log to be persisted |
| **Background** | Drain `query.log` jobs into `QueryLogStore` | Block or crash the HTTP server |

Hits **and** misses are logged (`found: true/false`). List and delete are not “DNS queries” in this API, so they do not enqueue.

### Queue — `src/jobs/queue.js`

**Choice: in-process FIFO job queue**, not Redis / BullMQ / SQS.

The record store is already in-process RAM. A Redis queue would add a moving part without surviving a crash: if this Node process dies, the DNS data is gone too. The production swap path is the same job type (`query.log`) on a different transport.

| Decision | Why |
| --- | --- |
| **FIFO array** (`ready[]`) | Logs should drain in arrival order. Enqueue and dequeue are O(1). |
| **No delayed / scheduled lane** | Query logs are due *now*. A min-heap keyed by `runAt` would be the right structure for TTL expiry; that feature was not chosen. |
| **Synchronous `enqueue`** | The HTTP handler never `await`s a worker. The job object is placed in memory and the response is sent. |
| **`dropIfFull: true`** | Cap is `DNS_QUEUE_MAX` (default 10,000). When full, new log jobs are discarded (`dropped` counter). Analytics may lose entries under load; resolve never waits. |
| **Waiting dequeue** | If the FIFO is empty, `dequeue(signal)` parks on a waiter list instead of spinning. An enqueue wakes one waiter directly. |

Queue stats (`ready`, `enqueued`, `dequeued`, `dropped`) are exposed on `GET /api/analytics/queries` so you can see backpressure without attaching a debugger.

### Background workers — `src/jobs/worker.js`

**Choice: in-process async worker loops on the Node event loop**, not `worker_threads`, not a second process.

`query.log` only appends to an in-memory ring buffer. Extra OS threads would not make that faster and would need a lock around the buffer. The worker is an `async` `while` loop: `await queue.dequeue(signal)` → run `handlers[job.type]` → repeat.

| Decision | Why |
| --- | --- |
| **Default `DNS_WORKER_CONCURRENCY=1`** | One loop is enough for in-memory appends. The event loop already interleaves HTTP and the worker. |
| **Concurrency is configurable** | Raise it if the handler later writes to a remote sink (file, HTTP, warehouse) where overlapping I/O helps. |
| **Dispatch by `job.type`** | Today the only handler is `query.log` (`src/jobs/handlers.js`). The same worker can host other types later without a new runtime. |
| **Failures are isolated** | A thrown handler is logged and skipped. The worker keeps running; the HTTP server is not affected. |
| **Lifecycle tied to Fastify** | Workers start on `onReady` and stop on `onClose` (`AbortController` + `queue.close()` so a parked `dequeue` unblocks). |

### Scheduling strategy

Query logging is **event-driven and immediate**, not periodic.

| Strategy | Used here? | Role |
| --- | --- | --- |
| **Event-driven (on resolve)** | Yes — primary | Each `GET /api/dns/{hostname}` produces one `query.log` job at the moment of the query. Scheduling cost is one array push (or a drop). |
| **Pull-based workers** | Yes | Workers sleep on `dequeue` until a job exists. There is **no `setInterval` poll** of the queue. |
| **FIFO drain** | Yes | Ready jobs run in enqueue order. No priority queue. |
| **Load-shedding** | Yes | When the queue is at cap, **new** jobs are dropped. Already-queued logs still drain. |
| **Delayed jobs (`runAt` / min-heap)** | No | That is the right scheduler for “expire this record in N seconds.” Not needed for logging. |
| **Periodic producer (cron / sweep)** | No | A timer that flushes logs every N seconds would add delay to analytics and is unnecessary when workers already wake on enqueue. |

In short: **schedule at query time, run as soon as a worker is free, drop rather than block**.

### Persistence of logs — `src/queryLog.js`

The worker is the only writer. `QueryLogStore` is a ring buffer (`DNS_QUERY_LOG_MAX`, default 10,000). When full, the oldest entry is evicted. The request path never calls `append`.

### How to observe it

```bash
# 1. Create a record
curl -s -X POST http://127.0.0.1:8000/api/dns \
  -H 'Content-Type: application/json' \
  -d '{"type":"A","hostname":"example.com","value":"192.168.1.1"}'

# 2. Resolve — response is not delayed by logging
curl -s http://127.0.0.1:8000/api/dns/example.com

# 3. Worker has (or soon will have) written the log
curl -s 'http://127.0.0.1:8000/api/analytics/queries?hostname=example.com'
```

A 404 resolve is also logged (`found: false`). `queue.dropped` stays `0` unless you exceed `DNS_QUEUE_MAX`.

## DNS rules enforced

- Multiple A records per hostname are allowed. Successive **resolves** rotate that RRset (round-robin). Listing records keeps insertion order.
- A hostname may have at most one CNAME, and a CNAME cannot coexist with A records.
- CNAME chaining is allowed (for example `www` → `blog` → `example.com`).
- Cycles are rejected on insert and detected again on resolve. Self-CNAMEs are rejected. Chain depth is capped at 10.
- Duplicate `(hostname, type, value)` tuples are rejected.
- Hostnames follow RFC 1123 (case-insensitive, trailing dots stripped, max 253 characters / 63 per label). Wildcards are not supported.
- A-record values must be valid IPv4 addresses. CNAME values must be hostnames, not IPs.
- Record types are case-insensitive (`a` / `A`, `cname` / `CNAME`).

## Implementation decisions

These choices keep the service small, testable, and close to real DNS rules without extra infrastructure.

- **Fastify over a heavier framework.** The assignment asked for Node.js. Fastify gives JSON-schema request validation, a small plugin model, and `app.inject()` for HTTP tests without binding a port. DNS rules do not live in the HTTP layer.
- **In-memory store (`Map` by hostname).** This is a mini service. A database would not improve correctness in a single-process demo, and it would slow tests. Node’s event loop plus synchronous store methods avoid write races. Restarting the process clears data; that is documented, not a surprise.
- **Service layer separate from HTTP.** Validators and constraint checks live in `src/service.js`. Unit tests cover DNS rules without spinning up Fastify. Routes only parse the request and map domain errors to HTTP.
- **Centralized errors.** `DnsValidationError` / `DnsNotFoundError` / `DnsConflictError` / `DnsCycleError` all serialize to `{ error, message, details }` with 400 / 404 / 409. Fastify schema failures are remapped to the same `VALIDATION_ERROR` body.
- **Query logging is the one senior async feature.** Resolve never writes the analytics buffer; a worker does. Under load, logs may drop rather than slow DNS answers. TTL expiry and health-check failover were not implemented (the brief asked for at least one).
- **In-process FIFO queue, not Redis.** Records are already in RAM. Redis would not survive a process crash either. The swap path is the same `query.log` job type on BullMQ/SQS later.
- **`pointsTo` is the immediate CNAME target**, matching the assignment example, not the final canonical name after the full chain. `resolvedIps` still follows the chain.
- **Round-robin on resolve only.** Listing records keeps insertion order so the management API is stable; only `GET /api/dns/{hostname}` rotates A-record IPs, like many real resolvers.

## Assessment criteria

| Criterion | Where it shows up |
| --- | --- |
| **Functional correctness** | A + CNAME rules in `src/service.js`: multiple A records, exclusive CNAME, chain following, insert + resolve cycle detection, duplicate rejection. |
| **Code quality** | HTTP (`routes/`) is separate from DNS rules (`service.js`), persistence (`store.js`), and validation (`validators.js`). Job runtime lives under `src/jobs/`. |
| **Validation & errors** | RFC 1123 hostnames, IPv4, CNAME-must-not-be-IP, Fastify JSON schemas. Errors are `{ error, message, details }` with 400 / 404 / 409. |
| **Testing** | `npm test` — validators, DNS rules, HTTP API, query-log jobs, queue. Edge cases include cycles, depth cap, dangling CNAME, round-robin, schema failures. |
| **Realism & scalability** | RFC 1034 CNAME exclusivity, chain depth 10, round-robin A RRsets. In-memory store is intentional for a mini service; the query-log queue has backpressure (`query.log` may drop) and a documented swap path to Redis/BullMQ. |
| **Documentation** | This README: setup, env vars, curl examples, status tables, async architecture, layout. Postman collection in `postman/`. |
| **AI transparency** | [AI tool usage](#ai-tool-usage): Cursor agent (not autocomplete), files marked, **backend-only** chat history in `AI_CHAT_HISTORY.md` + `ai-chat-history/`. |

## Project layout

```
backend/
├── src/
│   ├── server.js              # Listen entrypoint
│   ├── app.js                 # Fastify app, error handlers, job runtime
│   ├── routes/dns.js          # DNS HTTP endpoints
│   ├── routes/analytics.js    # Query-log snapshot
│   ├── service.js             # DNS rules, resolve, enqueue
│   ├── store.js               # In-memory repository
│   ├── queryLog.js            # Ring buffer written by the query.log worker
│   ├── validators.js          # Hostname / IPv4 checks
│   ├── schemas.js             # Fastify JSON schemas
│   └── jobs/
│       ├── index.js           # Start query-log workers
│       ├── queue.js           # FIFO + backpressure for query.log
│       ├── worker.js          # Background drain loop
│       └── handlers.js        # query.log
├── tests/
├── postman/
├── README.md                  # This file
├── AI_USAGE.md                # AI disclosure
├── AI_CHAT_HISTORY.md         # Human-readable prompt log (upload this)
├── ai-chat-history/           # Raw Cursor JSONL transcripts (upload this)
└── package.json
```

## AI tool usage

The assignment allows and encourages AI tools (for example ChatGPT or Cursor).

This **backend** project used a **Cursor agent** (model: Grok), 2026-09-04. It was **not** in-line editor completion only, so chat history is included **in this folder**.

The recruiter calendar is a separate project. Do not look here for web chats — they are only under `web/`.

| Assignment rule | This submission |
| --- | --- |
| Clearly document AI use | **Cursor agent** (model: Grok), 2026-09-04. Not ChatGPT in a browser. |
| Upload chat history **or** mark AI-generated code in the README | **Both.** History: [AI_CHAT_HISTORY.md](AI_CHAT_HISTORY.md) and [`ai-chat-history/`](ai-chat-history/). Code marked below. |
| If **only** in-line editor completion was used, say so and skip uploading history | **Does not apply.** This was **not** Copilot / Cursor Tab / autocomplete-only. An agent wrote the implementation in multi-step chats. History is therefore included. |

Do **not** treat any application code in this folder as handwritten.

### AI-generated code (marked)

Everything listed here was generated or rewritten by the Cursor agent, then run locally with `npm test` / `npm start`:

| Path | Role |
| --- | --- |
| `src/server.js`, `src/app.js`, `src/config.js` | Process entry, Fastify app, env |
| `src/routes/dns.js`, `src/routes/analytics.js` | HTTP |
| `src/service.js`, `src/store.js`, `src/record.js` | DNS domain + in-memory store |
| `src/validators.js`, `src/errors.js`, `src/schemas.js` | Validation and errors |
| `src/queryLog.js`, `src/jobs/*` | Async query logging (queue, workers) |
| `tests/*.test.js` | Unit and API tests |
| `postman/Mini-DNS-Service.postman_collection.json` | Postman collection |
| `README.md`, `AI_USAGE.md`, `AI_CHAT_HISTORY.md` | Documentation |

There is no separate “human-written” source tree. Review and execution (`npm test`, curl, Postman) were done on the machine running Cursor.

### Chat history (upload with the submission)

Include these files when you zip or push the project:

1. [AI_CHAT_HISTORY.md](AI_CHAT_HISTORY.md) — readable list of prompts
2. [`ai-chat-history/*.jsonl`](ai-chat-history/) — full Cursor transcripts
3. [AI_USAGE.md](AI_USAGE.md) — tool, dates, file list


