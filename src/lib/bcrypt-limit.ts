/**
 * Concurrency limiter for bcrypt work.
 *
 * bcryptjs is pure JS and runs on the main thread — each hash/compare at
 * cost 12 burns ~200-300ms of CPU. Without a cap, a flood of login/register
 * requests would monopolize the event loop and starve game traffic
 * (scoreboard, submissions). This bounds concurrent bcrypt operations so the
 * platform stays responsive regardless of request rate.
 *
 * In-process, single-instance state — exactly right for the single-container
 * deploy. The dedicated auth rate limit (middleware) and Nginx limit_req are
 * the earlier, cheaper lines of defense; this is the last one.
 */

const MAX_CONCURRENT = 3;
const MAX_QUEUE = 50;

let active = 0;
const queue: Array<() => void> = [];

export class BcryptBusyError extends Error {
  constructor() {
    super("BCRYPT_BUSY");
    this.name = "BcryptBusyError";
  }
}

/**
 * Runs `fn` in a bounded bcrypt slot. Waits for a free slot if under the
 * concurrency cap; throws {@link BcryptBusyError} if the queue is full so the
 * caller can shed load (503) instead of piling up work.
 */
export async function withBcryptSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    if (queue.length >= MAX_QUEUE) {
      throw new BcryptBusyError();
    }
    await new Promise<void>((resolve) => queue.push(resolve));
  }

  active++;
  try {
    return await fn();
  } finally {
    active--;
    const next = queue.shift();
    if (next) next();
  }
}
