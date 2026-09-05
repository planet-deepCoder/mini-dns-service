import { WEEK_LABEL } from "../data/week";

export function Header() {
  return (
    <header className="mb-6 flex items-end justify-between gap-6">
      <div>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
          Recruiter workspace
        </p>
        <h1 className="font-display text-[2.6rem] leading-none tracking-[-0.03em]">
          Interview Desk
        </h1>
      </div>
      <p className="text-sm text-muted">{WEEK_LABEL}</p>
    </header>
  );
}
