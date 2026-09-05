import { SchedulerPage } from "./components/SchedulerPage";
import { StatusScreens } from "./components/StatusScreens";
import { usePeople } from "./hooks/usePeople";

export default function App() {
  const people = usePeople();

  if (people.status === "loading") {
    return <StatusScreens status="loading" />;
  }

  if (people.status === "error") {
    return <StatusScreens status="error" message={people.message} onRetry={people.retry} />;
  }

  return <SchedulerPage engineers={people.engineers} candidates={people.candidates} />;
}
