import { ValueObject } from '../../../../shared/domain/ValueObject';

interface TicketItemProps {
  menuItemId: string;
  quantity: number;
}

export class TicketItem extends ValueObject<TicketItemProps> {
  private constructor(props: TicketItemProps) {
    super(props);
  }

  get menuItemId(): string {
    return this.props.menuItemId;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  public static create(menuItemId: string, quantity: number): TicketItem {
    if (quantity <= 0) {
      throw new Error('Domain Exception: TicketItem quantity must be greater than zero.');
    }
    return new TicketItem({ menuItemId, quantity });
  }
}
