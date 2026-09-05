import type {
  Candidate,
  Day,
  DurationMinutes,
  Engineer,
  Interview,
  SlotMatch,
  TimeRange,
  TimeSlot,
} from "../types";

export const DAYS: Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export const DAY_LABELS: Record<Day, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
};

export const DAY_START_MINUTES = 9 * 60;
export const DAY_END_MINUTES = 18 * 60;
export const DURATIONS: DurationMinutes[] = [15, 30, 60];

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    throw new Error(`Invalid time '${time}'. Expected HH:MM.`);
  }
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatTime12(timeOrMinutes: string | number): string {
  const minutes =
    typeof timeOrMinutes === "number" ? timeOrMinutes : timeToMinutes(timeOrMinutes);
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function formatRange12(start: string | number, end: string | number): string {
  return `${formatTime12(start)}–${formatTime12(end)}`;
}

export function buildTimeSlots(durationMinutes: DurationMinutes): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let start = DAY_START_MINUTES; start + durationMinutes <= DAY_END_MINUTES; start += durationMinutes) {
    slots.push({
      start,
      end: start + durationMinutes,
      startTime: minutesToTime(start),
      endTime: minutesToTime(start + durationMinutes),
    });
  }
  return slots;
}

export function intervalsOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}

export function isRangeCoveringInterval(
  range: TimeRange,
  day: Day,
  startMinutes: number,
  durationMinutes: number,
): boolean {
  if (range.day !== day) {
    return false;
  }
  const from = timeToMinutes(range.start);
  const to = timeToMinutes(range.end);
  return startMinutes >= from && startMinutes + durationMinutes <= to;
}

export function hasOverlappingBooking(
  bookings: Interview[],
  day: Day,
  startMinutes: number,
  endMinutes: number,
  predicate: (booking: Interview) => boolean,
): boolean {
  return bookings.some(
    (booking) =>
      booking.day === day &&
      intervalsOverlap(startMinutes, endMinutes, booking.startMinutes, booking.endMinutes) &&
      predicate(booking),
  );
}

export function getSlotMatch({
  candidate,
  engineers,
  day,
  startMinutes,
  durationMinutes,
  bookings = [],
}: {
  candidate: Candidate | null;
  engineers: Engineer[];
  day: Day;
  startMinutes: number;
  durationMinutes: DurationMinutes;
  bookings?: Interview[];
}): SlotMatch {
  const endMinutes = startMinutes + durationMinutes;

  const covering = engineers.filter((engineer) =>
    engineer.availability.some((range) =>
      isRangeCoveringInterval(range, day, startMinutes, durationMinutes),
    ),
  );

  const availableEngineers = covering.filter(
    (engineer) =>
      !hasOverlappingBooking(
        bookings,
        day,
        startMinutes,
        endMinutes,
        (booking) => booking.engineerId === engineer.id,
      ),
  );

  const busyEngineers = covering.filter(
    (engineer) => !availableEngineers.some((open) => open.id === engineer.id),
  );

  const coversPreferred = candidate
    ? isRangeCoveringInterval(candidate.preferred, day, startMinutes, durationMinutes)
    : false;

  const candidateLocked = candidate
    ? hasOverlappingBooking(
        bookings,
        day,
        startMinutes,
        endMinutes,
        (booking) => booking.candidateId === candidate.id,
      )
    : false;

  const candidateAvailable = coversPreferred && !candidateLocked;
  const locked = candidateLocked || (coversPreferred && availableEngineers.length === 0 && busyEngineers.length > 0);

  return {
    availableEngineers,
    busyEngineers,
    candidateAvailable: coversPreferred,
    candidateLocked,
    bookable: Boolean(candidate) && candidateAvailable && availableEngineers.length > 0,
    locked,
  };
}

export function listBookableSlots({
  candidate,
  engineers,
  durationMinutes,
  bookings = [],
}: {
  candidate: Candidate | null;
  engineers: Engineer[];
  durationMinutes: DurationMinutes;
  bookings?: Interview[];
}) {
  if (!candidate) {
    return [];
  }

  const bookable = [];
  for (const day of DAYS) {
    for (const slot of buildTimeSlots(durationMinutes)) {
      const match = getSlotMatch({
        candidate,
        engineers,
        day,
        startMinutes: slot.start,
        durationMinutes,
        bookings,
      });
      if (match.bookable) {
        bookable.push({
          day,
          start: slot.start,
          end: slot.end,
          engineers: match.availableEngineers,
        });
      }
    }
  }
  return bookable;
}

export function createInterview({
  candidate,
  engineer,
  engineers,
  day,
  startMinutes,
  durationMinutes,
  bookings = [],
}: {
  candidate: Candidate | null;
  engineer: Engineer | null;
  engineers: Engineer[];
  day: Day;
  startMinutes: number;
  durationMinutes: DurationMinutes;
  bookings?: Interview[];
}): Interview {
  if (!candidate) {
    throw new Error("Select a candidate before scheduling.");
  }
  if (!engineer) {
    throw new Error("Select an engineer before scheduling.");
  }

  const match = getSlotMatch({
    candidate,
    engineers,
    day,
    startMinutes,
    durationMinutes,
    bookings,
  });

  if (match.locked) {
    throw new Error("That time slot is locked for this session.");
  }
  if (!match.bookable) {
    throw new Error("That slot is not available for both the candidate and an engineer.");
  }
  if (!match.availableEngineers.some((person) => person.id === engineer.id)) {
    throw new Error(`${engineer.name} is not available at that time.`);
  }

  const endMinutes = startMinutes + durationMinutes;
  return {
    id: `${candidate.id}-${engineer.id}-${day}-${startMinutes}-${durationMinutes}`,
    candidateId: candidate.id,
    candidateName: candidate.name,
    engineerId: engineer.id,
    engineerName: engineer.name,
    day,
    startMinutes,
    endMinutes,
    durationMinutes,
    summary: `${engineer.name} will interview ${candidate.name} on ${DAY_LABELS[day]} from ${formatTime12(startMinutes)} to ${formatTime12(endMinutes)}.`,
  };
}
