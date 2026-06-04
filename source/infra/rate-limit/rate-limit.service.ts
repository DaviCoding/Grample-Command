type RateLimitOptions = {
  windowSeconds: number;
  maxAttempts: number;
  blockSeconds?: number;
};

type RateLimitEntry = {
  attempts: number;
  resetAt: number;
  blockedUntil?: number;
  strikes: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export class RateLimitService {
  private readonly entries = new Map<string, RateLimitEntry>();

  consume(key: string, options: RateLimitOptions): RateLimitResult {
    const now = Date.now();
    const current = this.entries.get(key);

    if (current?.blockedUntil && current.blockedUntil > now) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((current.blockedUntil - now) / 1000)
      };
    }

    const entry = current && current.resetAt > now
      ? current
      : {
          attempts: 0,
          resetAt: now + options.windowSeconds * 1000,
          strikes: current?.strikes ?? 0
        };

    entry.attempts += 1;

    if (entry.attempts > options.maxAttempts) {
      entry.strikes += 1;
      const blockSeconds = (options.blockSeconds ?? options.windowSeconds) * entry.strikes;
      entry.blockedUntil = now + blockSeconds * 1000;
      this.entries.set(key, entry);

      return {
        allowed: false,
        retryAfterSeconds: blockSeconds
      };
    }

    this.entries.set(key, entry);

    return {
      allowed: true,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000)
    };
  }

  reset(key: string) {
    this.entries.delete(key);
  }
}
