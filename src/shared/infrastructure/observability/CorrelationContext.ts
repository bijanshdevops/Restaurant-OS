import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export class CorrelationContext {
  private static storage = new AsyncLocalStorage<string>();

  /**
   * Run a function within a new Correlation Context.
   * If a correlationId is not provided, a new one is generated.
   */
  public static run<T>(fn: () => T, correlationId?: string): T {
    const id = correlationId || randomUUID();
    return this.storage.run(id, fn);
  }

  /**
   * Retrieve the current Correlation ID, if any.
   */
  public static getId(): string | undefined {
    return this.storage.getStore();
  }
}
