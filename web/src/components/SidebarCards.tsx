import type { Candidate, Engineer } from "../types";
import { DAY_LABELS, formatRange12 } from "../lib/schedule";
import { Avatar } from "./Avatar";

type CandidateCardProps = {
  candidate: Candidate;
  bookableCount: number;
};

export function CandidateCard({ candidate, bookableCount }: CandidateCardProps) {
  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
        Preferred window
      </h2>
      <div className="mb-3 flex items-center gap-3">
        <Avatar name={candidate.name} src={candidate.image} size={44} />
        <div>
          <p className="font-semibold">{candidate.name}</p>
          <p className="text-[12px] text-muted">{candidate.role}</p>
        </div>
      </div>
      <p className="font-display text-[28px] leading-none">{DAY_LABELS[candidate.preferred.day]}</p>
      <p className="mt-1 mb-2 text-lg">
        {formatRange12(candidate.preferred.start, candidate.preferred.end)}
      </p>
      <p className="text-[13px] text-muted">
        {bookableCount} overlapping start{bookableCount === 1 ? "" : "s"} for this duration and
        engineer filter.
      </p>
    </section>
  );
}

export function EngineerList({ engineers }: { engineers: Engineer[] }) {
  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
        Interview panel
      </h2>
      <ul className="grid gap-2.5">
        {engineers.map((engineer) => (
          <li key={engineer.id} className="flex items-center gap-2.5">
            <span className="h-8 w-1 rounded-full" style={{ background: engineer.color }} />
            <Avatar name={engineer.name} src={engineer.image} color={engineer.color} size={32} />
            <span>
              <strong className="block text-sm">{engineer.name}</strong>
              <em className="block text-[12px] not-italic text-muted">{engineer.role}</em>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
