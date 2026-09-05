import { WEEK_DATES } from "../data/week";
import { DAY_LABELS, formatTime12 } from "../lib/schedule";
import type { Interview } from "../types";
import { Avatar } from "./Avatar";

type ConfirmationCardProps = {
  interview: Interview;
  candidateImage?: string;
};

export function ConfirmationCard({ interview, candidateImage }: ConfirmationCardProps) {
  return (
    <section className="rounded-xl border border-[#b7dcc6] bg-[#e9f6ee] p-4" role="status">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-bookable">
        Interview confirmed
      </p>
      <p className="mb-4 text-sm leading-relaxed">{interview.summary}</p>
      <dl className="grid gap-3 text-sm">
        <div className="flex items-center gap-2">
          <dt className="w-20 text-muted">Candidate</dt>
          <dd className="m-0 flex items-center gap-2 font-semibold">
            <Avatar name={interview.candidateName} src={candidateImage ?? ""} size={22} />
            {interview.candidateName}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="w-20 text-muted">Engineer</dt>
          <dd className="m-0 font-semibold">{interview.engineerName}</dd>
        </div>
        <div className="flex items-start gap-2">
          <dt className="w-20 text-muted">Time</dt>
          <dd className="m-0 font-semibold">
            {DAY_LABELS[interview.day]} {WEEK_DATES[interview.day]}
            <span className="mt-0.5 block font-medium text-ink">
              {formatTime12(interview.startMinutes)}–{formatTime12(interview.endMinutes)} ·{" "}
              {interview.durationMinutes} min
            </span>
          </dd>
        </div>
      </dl>
    </section>
  );
}
