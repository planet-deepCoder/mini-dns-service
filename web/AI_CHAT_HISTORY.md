# AI chat history (Cursor)

**Tool:** Cursor agent (model: Grok). Not in-line editor completion.

**Dates:** 2026-09-04 (America/Denver).

Raw transcript: [`ai-chat-history/01-interview-scheduler.jsonl`](ai-chat-history/01-interview-scheduler.jsonl).

---

## Interview scheduler — 7:37 PM onward

> Create a frontend interface that allows a recruiter to select a candidate, view a weekly calendar of 3 engineers, pick a 30-min slot that works for the candidate and at least one engineer, and confirm the interview. Calendar Mon–Fri 9 AM–6 PM, overlap highlighting, unit tests for availability logic.

> After confirming, changing the candidate should clear the confirmation UI so it does not keep the previous candidate.

> Allow filter by a specific engineer; lock a scheduled candidate slot for the session; duration 15 / 30 / 60; tests for availability math; DummyJSON (or similar) instead of hardcoded people; Tailwind; strong UI/UX.

> Install and configure Tailwind Vite CSS (`open 'tailwindcss'`)

> Booked cell showed for every engineer after a booking; should only show for the selected engineer.

> Revert: booked cell is tied to the candidate, not only the selected engineer.

Application code in this folder is marked AI-generated in [README.md](README.md#ai-tool-usage).
