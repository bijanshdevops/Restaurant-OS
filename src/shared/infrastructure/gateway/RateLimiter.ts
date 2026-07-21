export class RateLimiter {
  // In-memory sliding window store: { tenantId: { count, resetAt } }
  // Note: For production scaling across multiple Edge nodes or serverless instances, 
  // this state must be backed by a distributed store like Redis (e.g., using @upstash/redis).
  private static store = new Map<string, { count: number; resetAt: number }>();

  /**
   * Checks if a tenant has exceeded their request quota.
   * Defaults to 100 requests per 60 seconds.
   * 
   * @param tenantId The unique tenant identifier
   * @param limit Maximum number of requests allowed within the window
   * @param windowMs Time window in milliseconds
   * @returns true if allowed, false if rate limited
   */
  public static isAllowed(tenantId: string, limit: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = this.store.get(tenantId);

    // 1. First request or window expired
    if (!record || now > record.resetAt) {
      this.store.set(tenantId, { count: 1, resetAt: now + windowMs });
      return true;
    }

    // 2. Active window, under limit
    if (record.count < limit) {
      record.count += 1;
      return true;
    }

    // 3. Active window, over limit
    return false;
  }
}
