import { WEEK_DATES } from "../data/week";
import { DAY_LABELS, formatTime12 } from "../lib/schedule";
import type { Candidate, DurationMinutes, SlotMatch } from "../types";
import type { SelectedSlot } from "../hooks/useScheduler";
import { Avatar } from "./Avatar";

type DraftPanelProps = {
  candidate: Candidate;
  match: SlotMatch;
  slot: SelectedSlot;
  durationMinutes: DurationMinutes;
  selectedEngineerId: string | null;
  onEngineerChange: (id: string) => void;
  onConfirm: () => void;
  error: string;
};

export function DraftPanel({
  candidate,
  match,
  slot,
  durationMinutes,
  selectedEngineerId,
  onEngineerChange,
  onConfirm,
  error,
}: DraftPanelProps) {
  const engineer = match.availableEngineers.find((person) => person.id === selectedEngineerId);

  return (
    <section className="rounded-xl border border-bookable/30 bg-panel p-4 shadow-[var(--shadow-card)]">
      <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
        Schedule interview
      </h2>
      <p className="text-sm text-muted">
        {DAY_LABELS[slot.day]} {WEEK_DATES[slot.day]}
      </p>
      <p className="mb-3 font-display text-2xl leading-tight">
        {formatTime12(slot.start)}–{formatTime12(slot.start + durationMinutes)}
        <span className="ml-2 align-middle font-sans text-sm font-medium text-muted">
          {durationMinutes} min
        </span>
      </p>
      <div className="mb-3 flex items-center gap-2">
        <Avatar name={candidate.name} src={candidate.image} size={28} />
        <strong>{candidate.name}</strong>
      </div>
      <fieldset className="mb-3">
        <legend className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
          Available engineer
        </legend>
        <div className="grid gap-1.5">
          {match.availableEngineers.map((person) => (
            <label
              key={person.id}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm ${
                selectedEngineerId === person.id
                  ? "border-bookable bg-bookable-bg"
                  : "border-line bg-white hover:bg-paper"
              }`}
            >
              <input
                type="radio"
                name="engineer"
                value={person.id}
                checked={selectedEngineerId === person.id}
                onChange={() => onEngineerChange(person.id)}
                className="accent-bookable"
              />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: person.color }} />
              {person.name}
            </label>
          ))}
        </div>
      </fieldset>
      {error ? <p className="mb-2 text-[13px] text-[#9b2c2c]">{error}</p> : null}
      <button
        type="button"
        onClick={onConfirm}
        disabled={!engineer}
        className="w-full rounded-lg bg-bookable px-3 py-2.5 font-semibold text-white hover:brightness-105 disabled:opacity-40"
      >
        Confirm interview
      </button>
    </section>
  );
}
