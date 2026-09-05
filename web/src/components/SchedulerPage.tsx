import { useScheduler } from "../hooks/useScheduler";
import type { Candidate, Engineer } from "../types";
import { BookingList } from "./BookingList";
import { CalendarGrid } from "./CalendarGrid";
import { ConfirmationCard } from "./ConfirmationCard";
import { CandidateCard, EngineerList } from "./SidebarCards";
import { DraftPanel } from "./DraftPanel";
import { Header } from "./Header";
import { Legend } from "./Legend";
import { Toolbar } from "./Toolbar";

type SchedulerPageProps = {
  engineers: Engineer[];
  candidates: Candidate[];
};

export function SchedulerPage({ engineers, candidates }: SchedulerPageProps) {
  const scheduler = useScheduler(engineers, candidates);

  if (!scheduler.candidate) {
    return null;
  }

  const currentInterview =
    scheduler.justBooked?.candidateId === scheduler.candidateId
      ? scheduler.justBooked
      : scheduler.bookings.find((booking) => booking.candidateId === scheduler.candidateId) ??
        null;

  return (
    <div className="mx-auto max-w-[1280px] px-7 pb-12 pt-7">
      <Header />
      <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-[var(--shadow-card)]">
        <Toolbar
          candidates={candidates}
          engineers={engineers}
          candidateId={scheduler.candidateId}
          onCandidateChange={scheduler.setCandidateId}
          engineerFilter={scheduler.engineerFilter}
          onEngineerFilter={scheduler.setEngineerFilter}
          durationMinutes={scheduler.durationMinutes}
          onDurationChange={scheduler.setDurationMinutes}
          viewMode={scheduler.viewMode}
          onViewMode={scheduler.setViewMode}
        />
        <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start max-[980px]:grid-cols-1">
          <CalendarGrid
            candidate={scheduler.candidate}
            engineers={scheduler.visibleEngineers}
            durationMinutes={scheduler.durationMinutes}
            bookings={scheduler.bookings}
            selectedSlot={scheduler.selectedSlot}
            viewMode={scheduler.viewMode}
            onSelectSlot={scheduler.selectSlot}
          />
          <aside className="flex flex-col gap-3 border-l border-line p-4 max-[980px]:border-l-0 max-[980px]:border-t">
            <CandidateCard
              candidate={scheduler.candidate}
              bookableCount={scheduler.bookableSlots.length}
            />
            <EngineerList engineers={engineers} />
            <Legend />
            {scheduler.selectedMatch?.bookable && scheduler.selectedSlot ? (
              <DraftPanel
                candidate={scheduler.candidate}
                match={scheduler.selectedMatch}
                slot={scheduler.selectedSlot}
                durationMinutes={scheduler.durationMinutes}
                selectedEngineerId={scheduler.selectedEngineerId}
                onEngineerChange={scheduler.setSelectedEngineerId}
                onConfirm={scheduler.confirmInterview}
                error={scheduler.error}
              />
            ) : null}
            {currentInterview ? (
              <ConfirmationCard
                interview={currentInterview}
                candidateImage={scheduler.candidate.image}
              />
            ) : null}
            <BookingList bookings={scheduler.bookings} candidateId={scheduler.candidateId} />
          </aside>
        </div>
      </div>
    </div>
  );
}
