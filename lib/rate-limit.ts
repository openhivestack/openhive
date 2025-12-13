export interface RateLimitConfig {
  uniqueTokenPerInterval?: number; // Max number of unique tokens (IPs) to track
  interval?: number; // Reset interval in ms
}

export class RateLimiter {
  private tokens: Map<string, number[]>;
  private interval: number;

  constructor(config: RateLimitConfig = {}) {
    this.tokens = new Map();
    this.interval = config.interval || 60000; // Default 1 minute
  }

  check(token: string, limit: number): { success: boolean; limit: number; remaining: number } {
    const now = Date.now();
    const windowStart = now - this.interval;

    let timestamps = this.tokens.get(token) || [];

    // Filter out old timestamps
    timestamps = timestamps.filter(timestamp => timestamp > windowStart);

    // Check if limit is exceeded
    const success = timestamps.length < limit;

    if (success) {
      timestamps.push(now);
      this.tokens.set(token, timestamps);
    } else {
      // Update cleanup even if failed, to keep track of active abusers potentially
      this.tokens.set(token, timestamps);
    }

    return {
      success,
      limit,
      remaining: Math.max(0, limit - timestamps.length),
    };
  }
}

// Singleton instance for global use (within server instance)
export const globalRateLimiter = new RateLimiter({ interval: 60 * 1000 }); // 1 minute window
