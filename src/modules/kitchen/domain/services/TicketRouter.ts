import { KitchenTicket } from '../aggregates/KitchenTicket';
import { StationType } from '../value-objects/StationType';
import { TicketItem } from '../value-objects/TicketItem';
import { randomUUID } from 'crypto';

export interface RoutableItem {
  menuItemId: string;
  quantity: number;
  stationType: StationType;
}

/**
 * Domain Service responsible for routing a generalized order into specific Station tickets.
 */
export class TicketRouter {
  
  public route(tenantId: string, orderId: string, items: RoutableItem[]): KitchenTicket[] {
    const groupedItems = new Map<StationType, TicketItem[]>();

    // 1. Group items by their respective prep station
    for (const item of items) {
      const ticketItem = TicketItem.create(item.menuItemId, item.quantity);
      
      const existingGroup = groupedItems.get(item.stationType);
      if (existingGroup) {
        existingGroup.push(ticketItem);
      } else {
        groupedItems.set(item.stationType, [ticketItem]);
      }
    }

    const tickets: KitchenTicket[] = [];

    // 2. Generate a distinct Aggregate for each station
    for (const [stationType, ticketItems] of groupedItems.entries()) {
      const ticketId = randomUUID();
      const ticket = KitchenTicket.create(
        ticketId,
        tenantId,
        orderId,
        stationType,
        ticketItems
      );
      tickets.push(ticket);
    }

    return tickets;
  }
}
