import { WEEK_DATES } from "../data/week";
import type { SelectedSlot, ViewMode } from "../hooks/useScheduler";
import {
  DAYS,
  DAY_LABELS,
  buildTimeSlots,
  formatTime12,
  getSlotMatch,
} from "../lib/schedule";
import type { Candidate, DurationMinutes, Engineer, Interview } from "../types";
import { SlotCell } from "./SlotCell";

type CalendarGridProps = {
  candidate: Candidate | null;
  engineers: Engineer[];
  durationMinutes: DurationMinutes;
  bookings: Interview[];
  selectedSlot: SelectedSlot | null;
  viewMode: ViewMode;
  onSelectSlot: (day: (typeof DAYS)[number], start: number) => void;
};

const HEIGHT: Record<DurationMinutes, string> = {
  15: "h-5",
  30: "h-8",
  60: "h-[3.25rem]",
};

export function CalendarGrid({
  candidate,
  engineers,
  durationMinutes,
  bookings,
  selectedSlot,
  viewMode,
  onSelectSlot,
}: CalendarGridProps) {
  const slots = buildTimeSlots(durationMinutes);
  const heightClass = HEIGHT[durationMinutes];

  return (
    <section className="overflow-auto bg-[#fcf8f0] p-4" aria-label="Weekly availability calendar">
      <div
        className="grid min-w-[780px] gap-x-1.5 gap-y-0.5"
        style={{ gridTemplateColumns: "4.75rem repeat(5, minmax(7.5rem, 1fr))" }}
      >
        <div className="h-12" />
        {DAYS.map((day) => (
          <div key={day} className="flex flex-col justify-end px-2 pb-2">
            <span className="font-semibold">{DAY_LABELS[day]}</span>
            <small className="text-muted">{WEEK_DATES[day]}</small>
          </div>
        ))}

        {slots.map((slot) => (
          <div key={slot.start} className="contents">
            <div className="flex translate-y-[-3px] justify-end pr-2 pt-0.5 text-[11px] text-muted">
              {formatTime12(slot.start).replace(" ", "\u00a0")}
            </div>
            {DAYS.map((day) => {
              const match = getSlotMatch({
                candidate,
                engineers,
                day,
                startMinutes: slot.start,
                durationMinutes,
                bookings,
              });
              const selected = selectedSlot?.day === day && selectedSlot.start === slot.start;
              const muted = viewMode === "bookable" && !match.bookable && !match.locked;
              const engineerNames = match.availableEngineers.map((person) => person.name).join(", ");
              const label = match.bookable
                ? `${DAY_LABELS[day]} ${formatTime12(slot.start)}–${formatTime12(slot.end)}, overlap with ${engineerNames}. Schedule interview.`
                : match.locked
                  ? `${DAY_LABELS[day]} ${formatTime12(slot.start)}, locked for this session.`
                  : `${DAY_LABELS[day]} ${formatTime12(slot.start)}, not an overlap.`;

              return (
                <SlotCell
                  key={`${day}-${slot.start}`}
                  match={match}
                  selected={selected}
                  muted={muted}
                  heightClass={heightClass}
                  label={label}
                  onSelect={() => onSelectSlot(day, slot.start)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
