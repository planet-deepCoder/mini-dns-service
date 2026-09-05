import type { SlotMatch } from "../types";

type SlotCellProps = {
  match: SlotMatch;
  selected: boolean;
  muted: boolean;
  heightClass: string;
  label: string;
  onSelect: () => void;
};

export function SlotCell({ match, selected, muted, heightClass, label, onSelect }: SlotCellProps) {
  const covering = [...match.availableEngineers, ...match.busyEngineers];
  const caption = match.locked
    ? match.candidateLocked
      ? "Booked"
      : "Locked"
    : match.bookable
      ? match.availableEngineers.length === 1
        ? match.availableEngineers[0].name.split(" ")[0]
        : `${match.availableEngineers.length}`
      : null;

  let tone = "cursor-default border-transparent bg-[#f4eee4]";
  if (match.locked) {
    tone = "cursor-not-allowed border-locked/20 bg-locked text-white";
  } else if (match.bookable) {
    tone = selected
      ? "cursor-pointer border-bookable bg-[#bfe4ce] shadow-[inset_0_0_0_1px_#1a6d45]"
      : "cursor-pointer border-[#8ec9a8] bg-bookable-bg hover:border-bookable hover:bg-[#c6e8d4]";
  } else if (match.candidateAvailable && covering.length === 0) {
    tone = "cursor-default border-dashed border-[#e0a078] bg-candidate-bg";
  } else if (covering.length > 0 && !match.candidateAvailable) {
    tone =
      "cursor-default border-transparent bg-[repeating-linear-gradient(-45deg,#ece7dc,#ece7dc_5px,#e2ddd2_5px,#e2ddd2_10px)]";
  }

  const dots = match.locked
    ? [...match.busyEngineers, ...match.availableEngineers]
    : match.availableEngineers;

  return (
    <button
      type="button"
      className={`flex items-center justify-between gap-1 rounded-md border px-1.5 text-left transition-colors ${heightClass} ${tone} ${muted ? "opacity-[0.18]" : ""}`}
      disabled={!match.bookable}
      aria-label={label}
      aria-pressed={selected}
      title={label}
      onClick={onSelect}
    >
      <span className="flex gap-0.5" aria-hidden="true">
        {dots.map((engineer) => (
          <span
            key={engineer.id}
            className="h-2 w-2 rounded-full"
            style={{ background: match.locked ? "#fff" : engineer.color }}
          />
        ))}
      </span>
      {caption ? <span className="truncate text-[11px] font-semibold">{caption}</span> : null}
    </button>
  );
}
