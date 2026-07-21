import { IDomainEvent } from '../../domain/IDomainEvent';

/**
 * Port (Interface) defining how application services dispatch domain events 
 * out to the rest of the Modular Monolith.
 */
export interface IEventBus {
  publish(event: IDomainEvent): Promise<void>;
  subscribe(eventName: string, handler: (event: IDomainEvent) => Promise<void>): void;
  hasSubscribers(eventName: string): boolean;
}
