# Interview Desk

Desktop recruiter UI for booking an interview in a window that works for the candidate and at least one engineer.

People (names, photos, titles) load from [DummyJSON](https://dummyjson.com/users). Calendar windows live in `src/data/availability.json`, keyed by those user ids.

Styles use [Tailwind CSS v4](https://tailwindcss.com/docs/installation/using-vite) via the `@tailwindcss/vite` plugin.

> **AI:** Cursor agent (not in-line completion). Source in `src/` is AI-generated. **Web chat history only:** [AI_CHAT_HISTORY.md](AI_CHAT_HISTORY.md) and [ai-chat-history/](ai-chat-history/). Backend history is under `backend/`.

## Setup

Requires Node.js 20.11+.

```bash
cd web
npm install
npm run dev
```

Open http://127.0.0.1:5173

```bash
npm test
npm run build
```

## How to use it

1. Choose a candidate. DummyJSON user 4 prefers **Tuesday 2:00–5:00 PM**.
2. Optionally filter to one engineer (avatar chips) and set duration to **15 / 30 / 60** minutes.
3. The week grid is Monday–Friday, 9:00 AM–6:00 PM. Row size follows the duration.
4. **Green cells** are overlaps. Click one, pick an engineer if needed, then **Confirm interview**.
5. Confirmed times are **locked for the session** — that candidate cannot reuse the window, and that engineer is busy for anyone else.

**Overlaps** dims everything except bookable and locked cells.

## Tests

`src/lib/schedule.test.ts` covers availability math, not whether the page renders:

- Exclusive end times and contiguous blocks for 15 / 30 / 60 minutes
- Midday gaps (a 60-minute meeting cannot straddle a break)
- Engineer filter narrowing the intersection
- Session locks for the candidate and for the booked engineer
- Confirmation payload and rejection of busy or conflicting engineers

## AI tool usage

The assignment allows and encourages AI tools (for example ChatGPT or Cursor).

This **web** project used a **Cursor agent** (model: Grok), 2026-09-04. It was **not** in-line editor completion only, so chat history is included **in this folder**.

The Mini DNS API is a separate project. Do not look here for backend chats — they are only under `backend/`.

| Assignment rule | This submission |
| --- | --- |
| Clearly document AI use | Cursor agent, not ChatGPT in a browser |
| Upload chat history **or** mark AI-generated code | **Both.** [AI_CHAT_HISTORY.md](AI_CHAT_HISTORY.md), [`ai-chat-history/`](ai-chat-history/), files marked below |
| Only in-line completion → skip uploading history | **Does not apply** |

### AI-generated code (marked)

| Path | Role |
| --- | --- |
| `src/lib/schedule.ts`, `src/lib/schedule.test.ts` | Availability / booking math and tests |
| `src/hooks/*`, `src/api/loadPeople.ts`, `src/data/*` | People, week, availability |
| `src/components/*`, `src/App.tsx`, `src/main.tsx`, `src/styles.css` | UI |
| `README.md`, `AI_USAGE.md`, `AI_CHAT_HISTORY.md` | Documentation |

### Chat history (upload with the web app)

1. [AI_CHAT_HISTORY.md](AI_CHAT_HISTORY.md)
2. [`ai-chat-history/*.jsonl`](ai-chat-history/)
3. [AI_USAGE.md](AI_USAGE.md)

