import { EventEmitter } from 'events';
import { IEventBus } from '../../application/ports/IEventBus';
import { IDomainEvent } from '../../domain/IDomainEvent';

class InMemoryEventBusImpl implements IEventBus {
  private emitter = new EventEmitter();

  public async publish(event: IDomainEvent): Promise<void> {
    // Dispatch the event asynchronously to prevent blocking the publishing thread
    // Errors in subscribers are caught inside the subscribe() wrapper
    setImmediate(() => {
      this.emitter.emit(event.eventName, event);
    });
  }

  public subscribe(eventName: string, handler: (event: IDomainEvent) => Promise<void>): void {
    this.emitter.on(eventName, async (event: IDomainEvent) => {
      try {
        await handler(event);
      } catch (error) {
        // Robust error handling is essential so that one failing subscriber 
        // doesn't crash the event bus or other subscribers.
        console.error(`[EventBus] Error handling event ${eventName}:`, error);
      }
    });
  }

  public hasSubscribers(eventName: string): boolean {
    return this.emitter.listenerCount(eventName) > 0;
  }
}

// Singleton instantiation pattern for Node.js/Next.js
const globalForEventBus = global as unknown as { eventBus: InMemoryEventBusImpl };

export const inMemoryEventBus =
  globalForEventBus.eventBus || new InMemoryEventBusImpl();

if (process.env.NODE_ENV !== 'production') {
  globalForEventBus.eventBus = inMemoryEventBus;
}
