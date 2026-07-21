import { Entity } from './Entity';

export interface DomainEvent {
  dateTimeOccurred: Date;
  name: string;
}

export abstract class AggregateRoot<T = string> extends Entity<T> {
  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): DomainEvent[] {
    return this._domainEvents;
  }

  protected addDomainEvent(domainEvent: any): void {
    this._domainEvents.push(domainEvent);
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }
}
