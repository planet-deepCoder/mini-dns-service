export function createJobHandlers({ queryLogs } = {}) {
  return {
    "query.log": async (job) => {
      queryLogs.append(job.payload); // persist one analytics row
    },
  };
}
