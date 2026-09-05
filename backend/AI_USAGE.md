# AI usage

**Tool:** Cursor agent (model: Grok). Allowed/encouraged by the assignment (alongside ChatGPT).

**Dates:** 2026-09-04 (America/Denver).

**Not in-line completion only.** Chat history for **this backend only** is included below. Web scheduler chats are in `web/`, not here.

## What the AI generated

All application code, tests, Postman collection, and docs in `backend/` — including:

| Area | Files |
| --- | --- |
| HTTP app | `src/server.js`, `src/app.js`, `src/routes/dns.js`, `src/routes/analytics.js`, `src/schemas.js`, `src/config.js` |
| DNS domain | `src/service.js`, `src/store.js`, `src/record.js`, `src/validators.js`, `src/errors.js` |
| Async jobs | `src/jobs/queue.js`, `src/jobs/worker.js`, `src/jobs/handlers.js`, `src/jobs/index.js`, `src/queryLog.js` |
| Tests | `tests/validators.test.js`, `tests/service.test.js`, `tests/api.test.js`, `tests/jobs.test.js`, `tests/queue.test.js` |
| Docs | `README.md`, `AI_USAGE.md`, `AI_CHAT_HISTORY.md`, `postman/Mini-DNS-Service.postman_collection.json` |

Those paths are also marked in [README.md](README.md#ai-generated-code-marked).

## What was run locally (not generated as “tests passing” without execution)

- `npm test` in `backend/`
- `npm start` and curl / Postman against `http://127.0.0.1:8000`

## Chat history to upload

- [AI_CHAT_HISTORY.md](AI_CHAT_HISTORY.md) — prompts in order
- [ai-chat-history/](ai-chat-history/) — Cursor JSONL transcripts
