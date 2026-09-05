// In-process FIFO queue. enqueue() never waits; workers call dequeue().
export class JobQueue {
  constructor({ maxSize = 10_000 } = {}) {
    this.maxSize = maxSize;
    this.ready = []; // jobs waiting for a worker
    this.waiters = []; // dequeue promises waiting for a job
    this._nextId = 1;
    this.enqueued = 0;
    this.dequeued = 0;
    this.dropped = 0;
  }

  get size() {
    return this.ready.length;
  }

  enqueue(type, payload = {}, { dropIfFull = false } = {}) {
    if (dropIfFull && this.size >= this.maxSize) {
      this.dropped += 1; // backpressure: skip analytics, keep DNS fast
      return null;
    }

    const job = {
      id: this._nextId++,
      type,
      payload,
      enqueuedAt: Date.now(),
    };

    this.enqueued += 1;
    this._deliver(job);
    return job;
  }

  dequeue(signal) {
    if (this.ready.length > 0) {
      this.dequeued += 1;
      return Promise.resolve(this.ready.shift());
    }
    if (signal?.aborted) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      let settled = false;
      const finish = (job) => {
        if (settled) {
          return; // abort and close can both fire
        }
        settled = true;
        signal?.removeEventListener("abort", onAbort);
        if (job) {
          this.dequeued += 1;
        }
        resolve(job);
      };

      const onJob = (job) => finish(job);
      const onAbort = () => {
        const index = this.waiters.indexOf(onJob);
        if (index !== -1) {
          this.waiters.splice(index, 1);
        }
        finish(null);
      };

      this.waiters.push(onJob);
      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) {
        onAbort();
      }
    });
  }

  stats() {
    return {
      ready: this.ready.length,
      enqueued: this.enqueued,
      dequeued: this.dequeued,
      dropped: this.dropped,
    };
  }

  close() {
    const waiters = this.waiters.splice(0);
    for (const waiter of waiters) {
      waiter(null); // unblock idle workers on shutdown
    }
  }

  _deliver(job) {
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(job); // hand off to a waiting worker
    } else {
      this.ready.push(job);
    }
  }
}
