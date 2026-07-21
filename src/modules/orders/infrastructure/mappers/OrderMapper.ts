import { Order } from '../../domain/aggregates/Order';
import { OrderLineItem } from '../../domain/value-objects/OrderLineItem';
import { OrderStatus } from '../../domain/value-objects/OrderStatus';
import { Money } from '../../../../shared/domain/value-objects/Money';

export class OrderMapper {
  public static toDomain(raw: any): Order {
    const items = (raw.items || []).map((rawItem: any) => {
      // Reconstruct Money using the currency stored at the Order level (or item level if it was stored there)
      const unitPrice = (Money as any).create(rawItem.unitPrice, raw.currency); 
      
      return new (OrderLineItem as any)({
        menuItemId: rawItem.menuItemId,
        quantity: rawItem.quantity,
        unitPrice: unitPrice
      });
    });

    const statusMap: Record<string, OrderStatus> = {
      'PENDING': OrderStatus.Pending,
      'PAID': OrderStatus.Paid,
      'PREPARING': OrderStatus.Preparing,
      'READY': OrderStatus.Ready,
      'COMPLETED': OrderStatus.Completed,
      'CANCELLED': OrderStatus.Cancelled
    };

    const mappedStatus = statusMap[raw.status] || OrderStatus.Pending;

    const order = new (Order as any)({
      tenantId: raw.tenantId,
      customerId: raw.customerId,
      status: mappedStatus,
      paymentTransactionId: raw.paymentTransactionId,
      items: items
    }, raw.id);
    
    return order;
  }

  public static toPersistence(order: Order): any {
    const total = order.calculateTotal();
    
    const statusMap: Record<OrderStatus, string> = {
      [OrderStatus.Pending]: 'PENDING',
      [OrderStatus.Paid]: 'PAID',
      [OrderStatus.Preparing]: 'PREPARING',
      [OrderStatus.Ready]: 'READY',
      [OrderStatus.Completed]: 'COMPLETED',
      [OrderStatus.Cancelled]: 'CANCELLED'
    };

    return {
      id: order.id,
      tenantId: order.tenantId,
      customerId: order.customerId,
      status: statusMap[order.status],
      paymentTransactionId: order.paymentTransactionId,
      totalAmount: total.amount,
      currency: total.currency,
      items: order.items.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.amount,
        subtotal: item.getSubtotal().amount
      }))
    };
  }
}
