import type { ReactNode } from "react";

import type { EngineerFilter, ViewMode } from "../hooks/useScheduler";
import { DURATIONS } from "../lib/schedule";
import type { Candidate, DurationMinutes, Engineer } from "../types";
import { Avatar } from "./Avatar";

type ToolbarProps = {
  candidates: Candidate[];
  engineers: Engineer[];
  candidateId: string;
  onCandidateChange: (id: string) => void;
  engineerFilter: EngineerFilter;
  onEngineerFilter: (id: EngineerFilter) => void;
  durationMinutes: DurationMinutes;
  onDurationChange: (duration: DurationMinutes) => void;
  viewMode: ViewMode;
  onViewMode: (mode: ViewMode) => void;
};

export function Toolbar({
  candidates,
  engineers,
  candidateId,
  onCandidateChange,
  engineerFilter,
  onEngineerFilter,
  durationMinutes,
  onDurationChange,
  viewMode,
  onViewMode,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 border-b border-line bg-panel/90 px-5 py-4">
      <label className="grid min-w-60 gap-1.5 text-xs font-semibold text-muted">
        Candidate
        <select
          value={candidateId}
          onChange={(event) => onCandidateChange(event.target.value)}
          className="h-10 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink outline-none ring-bookable/30 focus:ring-2"
        >
          {candidates.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name} — {person.role}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="min-w-0 flex-1">
        <legend className="mb-1.5 text-xs font-semibold text-muted">Engineer</legend>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={engineerFilter === "all"} onClick={() => onEngineerFilter("all")}>
            All
          </FilterChip>
          {engineers.map((engineer) => (
            <FilterChip
              key={engineer.id}
              active={engineerFilter === engineer.id}
              onClick={() => onEngineerFilter(engineer.id)}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: engineer.color }} />
              <Avatar name={engineer.name} src={engineer.image} color={engineer.color} size={18} />
              {engineer.name.split(" ")[0]}
            </FilterChip>
          ))}
        </div>
      </fieldset>

      <Segmented
        legend="Duration"
        options={DURATIONS.map((duration) => ({
          value: String(duration),
          label: `${duration} min`,
        }))}
        value={String(durationMinutes)}
        onChange={(value) => onDurationChange(Number(value) as DurationMinutes)}
      />

      <Segmented
        legend="Grid"
        options={[
          { value: "all", label: "Full week" },
          { value: "bookable", label: "Overlaps" },
        ]}
        value={viewMode}
        onChange={(value) => onViewMode(value as ViewMode)}
      />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex h-10 items-center gap-1.5 rounded-lg bg-ink px-3 text-sm font-medium text-white"
          : "inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm text-ink hover:bg-paper"
      }
    >
      {children}
    </button>
  );
}

function Segmented({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold text-muted">{legend}</legend>
      <div className="flex rounded-lg border border-line bg-white p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={
              value === option.value
                ? "h-9 rounded-md bg-ink px-3 text-sm font-semibold text-white"
                : "h-9 rounded-md px-3 text-sm text-ink hover:bg-paper"
            }
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
