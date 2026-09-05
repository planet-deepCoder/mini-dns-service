# MonoRepo Structure - modular full-stack architecture

# frontend - Desktop Recruiter app
Desktop recruiter app built with React + TypeScript, Vite and Tailwind CSS v4.3 for finding and booking interview times that work for candidates and engineers.
# How frontend works:
Pick a candidate and view their availability.
Scan Mon–Fri, 9 AM–6 PM in 30-minute slots.
Green = candidate + engineer overlap; striped = engineer only; dashed = candidate only; dark = booked.
Filter by engineer and meeting duration (15 / 30 / 60 min).
Click an available slot, choose an engineer, and confirm the interview.
Confirmed slots stay booked for the candidate; the engineer is unavailable for others.
Candidate names, photos, and titles come from DummyJSON; availability is stored locally.
Includes tests for scheduling and overlap logic.

# backend: mini-dns-service
Mini DNS Service - Node.js/Fastify HTTP API for in-memory A and CNAME records, DNS rule validation, CNAME chain resolution and async query logging. 
Includes a ready-to-import Postman collection.

This backend is a single Node.js process with everything in RAM. There is no Postgres, SQLite, Redis, or file that survives a restart.
JavaScript values sitting on the heap. Fastify then decorates the app with them (app.dnsStore, app.dnsService) so every HTTP request in that process shares the same store instance.
On restart of project on local memory will lost.
# comments also added to understand the code

# The actual data structure
DnsStore is not a table. It is:
this._records = new Map();
A Map is a hash table: hostname string → array of DnsRecord objects.
# What a database version would look like
Same HTTP and DnsService rules, but DnsStore.add would INSERT instead of map.set. Resolve would SELECT. TTL could be a column plus a sweeper, or Redis EXPIRE. The route would not need to change much; only the store implementation would.
Right now that layer is intentionally fake: DnsStore is the database, and the database is a Map in this Node process.
A DnsRecord is just a class instance with fields (hostname, type, value, createdAt, ttl, expiresAt). It is not a row in a DB.
# What happens on POST /api/dns, step by step
- Fastify parses JSON and runs the schema (type, hostname, value, optional ttl).
- The route calls dnsService.addRecord(...).
- The service normalizes (Example.COM. → example.com) and validates (IPv4 vs hostname).
- It reads this.store.listFor(hostname) — still RAM — and enforces DNS rules (no duplicate tuple, CNAME cannot coexist with A, no CNAME cycle).
- It constructs a DnsRecord and this.store.add(record) mutates the Map.
- If ttl was set, it also enqueues a delayed job into the in-memory JobQueue (another Map/heap, still RAM).
- The route serializes the object to JSON and returns 201.
- If a rule fails, it throws DnsValidationError / DnsConflictError / DnsCycleError. Nothing is written. The Map is unchanged.

