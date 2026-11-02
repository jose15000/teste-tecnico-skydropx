const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Serializes HTTP calls via a promise chain: min interval between dispatches + retry on 429/5xx. */
export class ThrottledHttp {
  private queue: Promise<unknown> = Promise.resolve();
  private lastDispatch = 0;

  constructor(
    private readonly minIntervalMs = 550,
    private readonly maxRetries = 3,
    private readonly baseBackoffMs = 1000,
  ) {}

  fetch(url: string, init?: RequestInit): Promise<Response> {
    const task = this.queue.then(() => this.send(url, init));
    this.queue = task.catch(() => undefined);
    return task;
  }

  private async send(url: string, init?: RequestInit): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      await sleep(Math.max(0, this.lastDispatch + this.minIntervalMs - Date.now()));
      this.lastDispatch = Date.now();
      try {
        const res = await fetch(url, init);
        const retryable = res.status === 429 || res.status >= 500;
        if (!retryable || attempt >= this.maxRetries) return res;
        await sleep(this.retryDelay(res, attempt));
      } catch (error) {
        if (attempt >= this.maxRetries) throw error;
        await sleep(this.baseBackoffMs * 2 ** attempt);
      }
    }
  }

  private retryDelay(res: Response, attempt: number): number {
    const retryAfter = Number(res.headers?.get?.('Retry-After'));
    return retryAfter > 0 ? retryAfter * 1000 : this.baseBackoffMs * 2 ** attempt;
  }
}
