import { KitchenTicket } from '../../domain/aggregates/KitchenTicket';
import { TicketItem } from '../../domain/value-objects/TicketItem';
import { PreparationStatus } from '../../domain/value-objects/PreparationStatus';
import { StationType } from '../../domain/value-objects/StationType';

export class KitchenTicketMapper {
  public static toDomain(raw: any): KitchenTicket {
    const items = (raw.items || []).map((rawItem: any) => {
      // Create via VO factory
      return (TicketItem as any).create(rawItem.menuItemId, rawItem.quantity);
    });

    const statusMap: Record<string, PreparationStatus> = {
      'WAITING': PreparationStatus.WAITING,
      'IN_PROGRESS': PreparationStatus.IN_PROGRESS,
      'READY': PreparationStatus.READY
    };

    const stationMap: Record<string, StationType> = {
      'GRILL': StationType.GRILL,
      'COLD_STATION': StationType.COLD_STATION,
      'BEVERAGE': StationType.BEVERAGE,
      'FRY_STATION': StationType.FRY_STATION
    };

    const status = statusMap[raw.status] || PreparationStatus.WAITING;
    const stationType = stationMap[raw.stationType] || StationType.GRILL;

    // Use private constructor via type casting to preserve historical state (e.g. IN_PROGRESS)
    // rather than the static .create() which forces it to WAITING
    return new (KitchenTicket as any)({
      tenantId: raw.tenantId,
      orderId: raw.orderId,
      stationType: stationType,
      status: status,
      items: items
    }, raw.id);
  }

  public static toPersistence(ticket: KitchenTicket): any {
    const statusMap: Record<PreparationStatus, string> = {
      [PreparationStatus.WAITING]: 'WAITING',
      [PreparationStatus.IN_PROGRESS]: 'IN_PROGRESS',
      [PreparationStatus.READY]: 'READY'
    };

    const stationMap: Record<StationType, string> = {
      [StationType.GRILL]: 'GRILL',
      [StationType.COLD_STATION]: 'COLD_STATION',
      [StationType.BEVERAGE]: 'BEVERAGE',
      [StationType.FRY_STATION]: 'FRY_STATION'
    };

    return {
      id: ticket.id,
      tenantId: ticket.tenantId,
      orderId: ticket.orderId,
      status: statusMap[ticket.status],
      stationType: stationMap[ticket.stationType],
      items: ticket.items.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity
      }))
    };
  }
}
