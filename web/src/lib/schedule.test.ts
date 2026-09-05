import { describe, expect, it } from "vitest";

import availability from "../data/availability.json";
import type { Candidate, DurationMinutes, Engineer, Interview, TimeRange } from "../types";
import {
  buildTimeSlots,
  createInterview,
  formatTime12,
  getSlotMatch,
  isRangeCoveringInterval,
  listBookableSlots,
  timeToMinutes,
} from "./schedule";

function engineer(id: string, name: string): Engineer {
  return {
    id,
    name,
    role: "Engineer",
    email: `${id}@example.com`,
    image: "",
    color: "#215e75",
    availability: availability.engineers[id as keyof typeof availability.engineers] as TimeRange[],
  };
}

function candidate(id: string, name: string): Candidate {
  return {
    id,
    name,
    role: "Candidate",
    email: `${id}@example.com`,
    image: "",
    preferred: availability.candidates[id as keyof typeof availability.candidates] as TimeRange,
  };
}

const alex = engineer("1", "Alex Rivera");
const priya = engineer("2", "Priya Shah");
const sam = engineer("3", "Sam Okonkwo");
const engineers = [alex, priya, sam];
const jordan = candidate("4", "Jordan Hale");
const maya = candidate("5", "Maya Chen");

function matchAt(
  person: Candidate,
  start: string,
  duration: DurationMinutes,
  day: TimeRange["day"] = "Tue",
  bookings: Interview[] = [],
  pool = engineers,
) {
  return getSlotMatch({
    candidate: person,
    engineers: pool,
    day,
    startMinutes: timeToMinutes(start),
    durationMinutes: duration,
    bookings,
  });
}

describe("availability intersection", () => {
  it("treats range end times as exclusive", () => {
    const range: TimeRange = { day: "Tue", start: "14:00", end: "17:00" };

    expect(isRangeCoveringInterval(range, "Tue", timeToMinutes("14:00"), 30)).toBe(true);
    expect(isRangeCoveringInterval(range, "Tue", timeToMinutes("16:30"), 30)).toBe(true);
    expect(isRangeCoveringInterval(range, "Tue", timeToMinutes("17:00"), 30)).toBe(false);
    expect(isRangeCoveringInterval(range, "Tue", timeToMinutes("16:00"), 60)).toBe(true);
    expect(isRangeCoveringInterval(range, "Tue", timeToMinutes("16:15"), 60)).toBe(false);
    expect(isRangeCoveringInterval(range, "Mon", timeToMinutes("14:00"), 30)).toBe(false);
  });

  it("requires a contiguous block for the selected duration", () => {
    expect(matchAt(jordan, "14:00", 60).bookable).toBe(true);
    expect(matchAt(jordan, "15:00", 60).availableEngineers.map((person) => person.id).sort()).toEqual([
      "2",
      "3",
    ]);
    expect(matchAt(jordan, "16:00", 60).availableEngineers.map((person) => person.id)).toEqual(["3"]);
    expect(matchAt(jordan, "16:00", 60).bookable).toBe(true);
    expect(matchAt(jordan, "17:00", 60).bookable).toBe(false);
  });

  it("does not invent availability across an engineer's midday gap", () => {
    const spanningNoon = getSlotMatch({
      candidate: maya,
      engineers: [alex],
      day: "Mon",
      startMinutes: timeToMinutes("11:30"),
      durationMinutes: 60,
    });
    expect(spanningNoon.bookable).toBe(false);
  });

  it("lists every 30-minute overlap for Jordan, with the correct engineers", () => {
    const slots = listBookableSlots({
      candidate: jordan,
      engineers,
      durationMinutes: 30,
    });

    expect(slots.every((slot) => slot.day === "Tue")).toBe(true);
    expect(slots.map((slot) => formatTime12(slot.start))).toEqual([
      "2:00 PM",
      "2:30 PM",
      "3:00 PM",
      "3:30 PM",
      "4:00 PM",
      "4:30 PM",
    ]);

    const twoPm = slots.find((slot) => slot.start === timeToMinutes("14:00"));
    const fourPm = slots.find((slot) => slot.start === timeToMinutes("16:00"));
    expect(twoPm?.engineers.map((person) => person.id).sort()).toEqual(["2", "3"]);
    expect(fourPm?.engineers.map((person) => person.id)).toEqual(["3"]);
  });

  it("uses 15-minute start times when duration is 15", () => {
    const slots = listBookableSlots({
      candidate: jordan,
      engineers,
      durationMinutes: 15,
    });
    expect(slots).toHaveLength(12);
    expect(slots[0]?.start).toBe(timeToMinutes("14:00"));
    expect(slots.at(-1)?.start).toBe(timeToMinutes("16:45"));
  });

  it("builds fewer grid starts for longer durations", () => {
    expect(buildTimeSlots(15)).toHaveLength(36);
    expect(buildTimeSlots(30)).toHaveLength(18);
    expect(buildTimeSlots(60)).toHaveLength(9);
  });

  it("does not treat engineer-only or candidate-only time as bookable", () => {
    const morning = matchAt(jordan, "09:00", 30);
    expect(morning.availableEngineers.map((person) => person.id)).toEqual(["2"]);
    expect(morning.candidateAvailable).toBe(false);
    expect(morning.bookable).toBe(false);

    const noEngineer = matchAt(jordan, "14:00", 30, "Tue", [], [alex]);
    expect(noEngineer.candidateAvailable).toBe(true);
    expect(noEngineer.availableEngineers).toEqual([]);
    expect(noEngineer.bookable).toBe(false);
  });

  it("limits overlaps to the filtered engineer", () => {
    const onlyPriya = listBookableSlots({
      candidate: jordan,
      engineers: [priya],
      durationMinutes: 30,
    });
    expect(onlyPriya.map((slot) => formatTime12(slot.start))).toEqual([
      "2:00 PM",
      "2:30 PM",
      "3:00 PM",
      "3:30 PM",
    ]);

    const onlyAlex = listBookableSlots({
      candidate: jordan,
      engineers: [alex],
      durationMinutes: 30,
    });
    expect(onlyAlex).toEqual([]);
  });

  it("locks a booked candidate slot for the rest of the session", () => {
    const booking = createInterview({
      candidate: jordan,
      engineer: priya,
      engineers,
      day: "Tue",
      startMinutes: timeToMinutes("14:00"),
      durationMinutes: 30,
    });

    const sameSlot = matchAt(jordan, "14:00", 30, "Tue", [booking]);
    expect(sameSlot.candidateLocked).toBe(true);
    expect(sameSlot.bookable).toBe(false);
    expect(sameSlot.locked).toBe(true);

    const laterSlot = matchAt(jordan, "15:00", 30, "Tue", [booking]);
    expect(laterSlot.bookable).toBe(true);

    const overlappingHour = matchAt(jordan, "14:00", 60, "Tue", [booking]);
    expect(overlappingHour.candidateLocked).toBe(true);
    expect(overlappingHour.bookable).toBe(false);
  });

  it("locks the booked engineer for other candidates without blocking a free teammate", () => {
    const booking = createInterview({
      candidate: jordan,
      engineer: priya,
      engineers,
      day: "Tue",
      startMinutes: timeToMinutes("14:00"),
      durationMinutes: 30,
    });

    const otherCandidate: Candidate = {
      ...jordan,
      id: "99",
      name: "Avery Kim",
    };

    const slot = matchAt(otherCandidate, "14:00", 30, "Tue", [booking]);
    expect(slot.busyEngineers.map((person) => person.id)).toEqual(["2"]);
    expect(slot.availableEngineers.map((person) => person.id)).toEqual(["3"]);
    expect(slot.bookable).toBe(true);

    const onlyPriya = matchAt(otherCandidate, "14:00", 30, "Tue", [booking], [priya]);
    expect(onlyPriya.bookable).toBe(false);
    expect(onlyPriya.locked).toBe(true);
  });

  it("creates a confirmation payload only when the chosen engineer is free", () => {
    const interview = createInterview({
      candidate: jordan,
      engineer: priya,
      engineers,
      day: "Tue",
      startMinutes: timeToMinutes("14:30"),
      durationMinutes: 30,
    });

    expect(interview.summary).toBe(
      "Priya Shah will interview Jordan Hale on Tuesday from 2:30 PM to 3:00 PM.",
    );
    expect(interview.durationMinutes).toBe(30);

    expect(() =>
      createInterview({
        candidate: jordan,
        engineer: alex,
        engineers,
        day: "Tue",
        startMinutes: timeToMinutes("14:30"),
        durationMinutes: 30,
      }),
    ).toThrow(/Alex Rivera is not available/);

    expect(() =>
      createInterview({
        candidate: jordan,
        engineer: sam,
        engineers,
        day: "Mon",
        startMinutes: timeToMinutes("09:00"),
        durationMinutes: 30,
      }),
    ).toThrow(/not available for both the candidate and an engineer/);

    expect(() =>
      createInterview({
        candidate: jordan,
        engineer: priya,
        engineers,
        day: "Tue",
        startMinutes: timeToMinutes("14:30"),
        durationMinutes: 30,
        bookings: [interview],
      }),
    ).toThrow(/locked for this session/);
  });
});
