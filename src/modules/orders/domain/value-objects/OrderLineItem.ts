import { ValueObject } from '../../../../shared/domain/ValueObject';
import { Money } from '../../../../shared/domain/value-objects/Money';

interface OrderLineItemProps {
  menuItemId: string;
  quantity: number;
  unitPrice: Money;
}

export class OrderLineItem extends ValueObject<OrderLineItemProps> {
  private constructor(props: OrderLineItemProps) {
    super(props);
  }

  get menuItemId(): string {
    return this.props.menuItemId;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get unitPrice(): Money {
    return this.props.unitPrice;
  }

  public getSubtotal(): Money {
    return this.props.unitPrice.multiply(this.props.quantity);
  }

  public static create(menuItemId: string, quantity: number, unitPrice: Money): OrderLineItem {
    if (quantity <= 0) {
      throw new Error("Domain Exception: Quantity must be greater than zero.");
    }
    return new OrderLineItem({ menuItemId, quantity, unitPrice });
  }
}
