import { AggregateRoot } from '../../../../shared/domain/AggregateRoot';
import { OrderLineItem } from '../value-objects/OrderLineItem';
import { OrderStatus } from '../value-objects/OrderStatus';
import { Money } from '../../../../shared/domain/value-objects/Money';
import { OrderPaidEvent } from '../events/OrderPaidEvent';
import { OrderPlacedEvent } from '../events/OrderPlacedEvent';

interface OrderProps {
  tenantId: string;
  customerId?: string;
  items: OrderLineItem[];
  status: OrderStatus;
  paymentTransactionId?: string;
}

export class Order extends AggregateRoot<OrderProps> {
  private constructor(props: OrderProps, id: string) {
    super(props, id);
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get customerId(): string | undefined {
    return this.props.customerId;
  }

  get items(): ReadonlyArray<OrderLineItem> {
    return this.props.items;
  }

  get status(): OrderStatus {
    return this.props.status;
  }

  get paymentTransactionId(): string | undefined {
    return this.props.paymentTransactionId;
  }

  public addItem(item: OrderLineItem): void {
    if (this.props.status !== OrderStatus.Pending) {
      throw new Error("Domain Exception: Cannot modify items once the order is no longer Pending.");
    }
    
    // In a real application, you might check if the item already exists to increment quantity
    // For this foundation, we simply append it to the array
    this.props.items.push(item);
  }

  public calculateTotal(): Money {
    if (this.props.items.length === 0) {
      return Money.create(0, 'USD'); // Default fallback
    }

    // Determine base currency from the first item
    const currency = this.props.items[0].unitPrice.currency;
    
    const totalAmount = this.props.items.reduce((sum, item) => {
      if (item.unitPrice.currency !== currency) {
        throw new Error("Domain Exception: Cannot calculate total with mixed currencies.");
      }
      return sum + item.getSubtotal().amount;
    }, 0);

    return Money.create(totalAmount, currency);
  }

  public markAsPaid(transactionId: string): void {
    if (this.props.items.length === 0) {
      throw new Error("Domain Exception: Cannot pay for an empty order.");
    }
    
    if (this.props.status !== OrderStatus.Pending) {
      throw new Error(`Domain Exception: Order cannot transition to Paid from ${this.props.status}.`);
    }

    this.props.status = OrderStatus.Paid;
    this.props.paymentTransactionId = transactionId;
    
    const total = this.calculateTotal();

    this.addDomainEvent(new OrderPaidEvent(
      this.props.tenantId,
      this.id,
      transactionId,
      total.amount,
      total.currency,
      this.props.items.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity
      }))
    ));
  }

  public static create(tenantId: string, id: string, customerId?: string): Order {
    return new Order({
      tenantId,
      customerId,
      items: [],
      status: OrderStatus.Pending
    }, id);
  }

  /**
   * Finalizes the initial creation and emits the OrderPlacedEvent.
   * Called after all initial items are added.
   */
  public finalizeCreation(): void {
    const total = this.calculateTotal();
    this.addDomainEvent(new OrderPlacedEvent(
      this.props.tenantId,
      this.id,
      this.props.customerId,
      total.amount,
      total.currency,
      this.props.items.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity
      }))
    ));
  }
}
