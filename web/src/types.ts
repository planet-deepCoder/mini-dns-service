export type Day = "Mon" | "Tue" | "Wed" | "Thu" | "Fri";
export type DurationMinutes = 15 | 30 | 60;

export type TimeRange = {
  day: Day;
  start: string;
  end: string;
};

export type Engineer = {
  id: string;
  name: string;
  role: string;
  email: string;
  image: string;
  color: string;
  availability: TimeRange[];
};

export type Candidate = {
  id: string;
  name: string;
  role: string;
  email: string;
  image: string;
  preferred: TimeRange;
};

export type Interview = {
  id: string;
  candidateId: string;
  candidateName: string;
  engineerId: string;
  engineerName: string;
  day: Day;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: DurationMinutes;
  summary: string;
};

export type TimeSlot = {
  start: number;
  end: number;
  startTime: string;
  endTime: string;
};

export type SlotMatch = {
  availableEngineers: Engineer[];
  busyEngineers: Engineer[];
  candidateAvailable: boolean;
  candidateLocked: boolean;
  bookable: boolean;
  locked: boolean;
};
