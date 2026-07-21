import { DomainEvent } from '@/shared/domain/events/DomainEvent';

export class InventoryLowEvent extends DomainEvent {
  constructor(
    public readonly tenantId: string,
    public readonly menuItemId: string,
    public readonly currentStock: number,
    public readonly threshold: number,
    aggregateId: string
  ) {
    super('InventoryLowEvent', aggregateId);
  }
}
