import { useEffect, useMemo, useState } from "react";

import {
  createInterview,
  getSlotMatch,
  listBookableSlots,
} from "../lib/schedule";
import type { Candidate, Day, DurationMinutes, Engineer, Interview } from "../types";

export type EngineerFilter = "all" | string;
export type ViewMode = "all" | "bookable";
export type SelectedSlot = { day: Day; start: number };

export function useScheduler(engineers: Engineer[], candidates: Candidate[]) {
  const [candidateId, setCandidateId] = useState(candidates[0]?.id ?? "");
  const [engineerFilter, setEngineerFilter] = useState<EngineerFilter>("all");
  const [durationMinutes, setDurationMinutes] = useState<DurationMinutes>(30);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [selectedEngineerId, setSelectedEngineerId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Interview[]>([]);
  const [error, setError] = useState("");
  const [justBooked, setJustBooked] = useState<Interview | null>(null);

  const candidate = candidates.find((person) => person.id === candidateId) ?? null;
  const visibleEngineers = useMemo(
    () =>
      engineerFilter === "all"
        ? engineers
        : engineers.filter((person) => person.id === engineerFilter),
    [engineerFilter, engineers],
  );

  const bookableSlots = useMemo(
    () =>
      listBookableSlots({
        candidate,
        engineers: visibleEngineers,
        durationMinutes,
        bookings,
      }),
    [candidate, visibleEngineers, durationMinutes, bookings],
  );

  const selectedMatch = selectedSlot
    ? getSlotMatch({
        candidate,
        engineers: visibleEngineers,
        day: selectedSlot.day,
        startMinutes: selectedSlot.start,
        durationMinutes,
        bookings,
      })
    : null;

  useEffect(() => {
    setSelectedSlot(null);
    setSelectedEngineerId(null);
    setError("");
    setJustBooked(null);
  }, [candidateId]);

  useEffect(() => {
    setSelectedSlot(null);
    setSelectedEngineerId(null);
    setError("");
  }, [durationMinutes, engineerFilter]);

  function selectSlot(day: Day, start: number) {
    const match = getSlotMatch({
      candidate,
      engineers: visibleEngineers,
      day,
      startMinutes: start,
      durationMinutes,
      bookings,
    });
    if (!match.bookable) {
      return;
    }
    setJustBooked(null);
    setError("");
    setSelectedSlot({ day, start });
    setSelectedEngineerId(match.availableEngineers[0]?.id ?? null);
  }

  function confirmInterview() {
    const engineer = visibleEngineers.find((person) => person.id === selectedEngineerId) ?? null;
    if (!selectedSlot) {
      return;
    }
    try {
      const interview = createInterview({
        candidate,
        engineer,
        engineers: visibleEngineers,
        day: selectedSlot.day,
        startMinutes: selectedSlot.start,
        durationMinutes,
        bookings,
      });
      setBookings((current) => [...current, interview]);
      setJustBooked(interview);
      setSelectedSlot(null);
      setSelectedEngineerId(null);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule that interview.");
    }
  }

  return {
    candidate,
    candidateId,
    setCandidateId,
    engineerFilter,
    setEngineerFilter,
    durationMinutes,
    setDurationMinutes,
    viewMode,
    setViewMode,
    selectedSlot,
    selectedEngineerId,
    setSelectedEngineerId,
    selectedMatch,
    bookings,
    bookableSlots,
    visibleEngineers,
    error,
    justBooked,
    selectSlot,
    confirmInterview,
  };
}
