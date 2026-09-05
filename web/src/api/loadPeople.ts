import availability from "../data/availability.json";
import { CANDIDATE_USER_IDS, ENGINEER_COLORS, ENGINEER_USER_IDS } from "../data/week";
import type { Candidate, Engineer, TimeRange } from "../types";

type DummyUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  image: string;
  company?: { title?: string; name?: string; department?: string };
};

type DummyResponse = {
  users: DummyUser[];
};

const USERS_URL = "https://dummyjson.com/users?limit=7&select=id,firstName,lastName,email,image,company";

function roleFor(user: DummyUser, fallback: string): string {
  return user.company?.title || user.company?.department || fallback;
}

export async function loadPeople(): Promise<{ engineers: Engineer[]; candidates: Candidate[] }> {
  const response = await fetch(USERS_URL);
  if (!response.ok) {
    throw new Error(`DummyJSON returned ${response.status}`);
  }

  const payload = (await response.json()) as DummyResponse;
  const users = new Map(payload.users.map((user) => [user.id, user]));

  const engineers = ENGINEER_USER_IDS.map((id, index) => {
    const user = users.get(id);
    if (!user) {
      throw new Error(`DummyJSON did not return engineer user ${id}.`);
    }
    return {
      id: String(id),
      name: `${user.firstName} ${user.lastName}`,
      role: roleFor(user, "Engineer"),
      email: user.email,
      image: user.image,
      color: ENGINEER_COLORS[index],
      availability: availability.engineers[String(id) as keyof typeof availability.engineers] as TimeRange[],
    } satisfies Engineer;
  });

  const candidates = CANDIDATE_USER_IDS.map((id) => {
    const user = users.get(id);
    if (!user) {
      throw new Error(`DummyJSON did not return candidate user ${id}.`);
    }
    return {
      id: String(id),
      name: `${user.firstName} ${user.lastName}`,
      role: roleFor(user, "Candidate"),
      email: user.email,
      image: user.image,
      preferred: availability.candidates[String(id) as keyof typeof availability.candidates] as TimeRange,
    } satisfies Candidate;
  });

  return { engineers, candidates };
}
