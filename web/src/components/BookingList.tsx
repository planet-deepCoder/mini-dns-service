import { DAY_LABELS, formatTime12 } from "../lib/schedule";
import type { Interview } from "../types";

type BookingListProps = {
  bookings: Interview[];
  candidateId: string;
};

export function BookingList({ bookings, candidateId }: BookingListProps) {
  const others = bookings.filter((booking) => booking.candidateId !== candidateId);

  if (bookings.length === 0) {
    return (
      <p className="px-1 text-[13px] leading-snug text-muted">
        Green cells are overlaps. Click one to draft a hold, then confirm. Confirmed times stay
        locked for this session.
      </p>
    );
  }

  if (others.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-line bg-white/60 p-3.5">
      <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
        Other session locks
      </h2>
      <ul className="grid gap-2">
        {others.map((booking) => (
          <li key={booking.id} className="text-[13px] leading-snug text-muted">
            <span className="font-medium text-ink">{booking.candidateName}</span>
            {" · "}
            {DAY_LABELS[booking.day]} {formatTime12(booking.startMinutes)}–
            {formatTime12(booking.endMinutes)}
          </li>
        ))}
      </ul>
    </section>
  );
}
