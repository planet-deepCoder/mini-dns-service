export function Legend() {
  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
        How to read the grid
      </h2>
      <ul className="grid gap-2 text-[13px] text-muted">
        <li className="flex items-center gap-2">
          <span className="h-4 w-4 rounded border border-bookable bg-bookable-bg" />
          Overlap — click to schedule
        </li>
        <li className="flex items-center gap-2">
          <span
            className="h-4 w-4 rounded border border-line"
            style={{
              background:
                "repeating-linear-gradient(-45deg, #ece7dc, #ece7dc 4px, #e2ddd2 4px, #e2ddd2 8px)",
            }}
          />
          Engineer free, candidate is not
        </li>
        <li className="flex items-center gap-2">
          <span className="h-4 w-4 rounded border border-dashed border-candidate bg-candidate-bg" />
          Candidate free, no engineer
        </li>
        <li className="flex items-center gap-2">
          <span className="h-4 w-4 rounded bg-locked" />
          Locked this session
        </li>
      </ul>
    </section>
  );
}
