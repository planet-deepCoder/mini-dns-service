import { useEffect, useState } from "react";

import { loadPeople } from "../api/loadPeople";
import type { Candidate, Engineer } from "../types";

type PeopleState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; engineers: Engineer[]; candidates: Candidate[] };

export function usePeople() {
  const [state, setState] = useState<PeopleState>({ status: "loading" });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    loadPeople()
      .then((people) => {
        if (!cancelled) {
          setState({ status: "ready", ...people });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Could not load people.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [nonce]);

  return {
    ...state,
    retry: () => setNonce((value) => value + 1),
  };
}
