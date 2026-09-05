type StatusScreensProps = {
  status: "loading" | "error";
  message?: string;
  onRetry?: () => void;
};

export function StatusScreens({ status, message, onRetry }: StatusScreensProps) {
  return (
    <div className="mx-auto max-w-lg px-7 py-24 text-center">
      <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted">Interview Desk</p>
      {status === "loading" ? (
        <>
          <h1 className="font-display text-4xl">Loading the panel</h1>
          <p className="mt-3 text-muted">Fetching people from DummyJSON…</p>
        </>
      ) : (
        <>
          <h1 className="font-display text-4xl">Couldn’t load people</h1>
          <p className="mt-3 text-muted">{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-6 rounded-lg bg-ink px-4 py-2 text-white"
          >
            Try DummyJSON again
          </button>
        </>
      )}
    </div>
  );
}
