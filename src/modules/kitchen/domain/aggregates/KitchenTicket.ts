import { AggregateRoot } from '../../../../shared/domain/AggregateRoot';
import { PreparationStatus } from '../value-objects/PreparationStatus';
import { StationType } from '../value-objects/StationType';
import { TicketItem } from '../value-objects/TicketItem';

interface KitchenTicketProps {
  tenantId: string;
  orderId: string;
  stationType: StationType;
  status: PreparationStatus;
  items: TicketItem[];
}

export class KitchenTicket extends AggregateRoot<KitchenTicketProps> {
  private constructor(props: KitchenTicketProps, id: string) {
    super(props, id);
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get orderId(): string {
    return this.props.orderId;
  }

  get stationType(): StationType {
    return this.props.stationType;
  }

  get status(): PreparationStatus {
    return this.props.status;
  }

  get items(): ReadonlyArray<TicketItem> {
    return this.props.items;
  }

  public startPreparation(): void {
    if (this.props.status !== PreparationStatus.WAITING) {
      throw new Error(`Domain Exception: Cannot start preparation on a ticket that is currently ${this.props.status}.`);
    }
    this.props.status = PreparationStatus.IN_PROGRESS;
  }

  public completePreparation(): void {
    if (this.props.status !== PreparationStatus.IN_PROGRESS) {
      throw new Error(`Domain Exception: Cannot complete preparation unless the ticket is IN_PROGRESS.`);
    }
    this.props.status = PreparationStatus.READY;
  }

  public static create(
    id: string,
    tenantId: string,
    orderId: string,
    stationType: StationType,
    items: TicketItem[]
  ): KitchenTicket {
    if (items.length === 0) {
      throw new Error('Domain Exception: Cannot create a KitchenTicket with zero items.');
    }
    
    return new KitchenTicket(
      {
        tenantId,
        orderId,
        stationType,
        status: PreparationStatus.WAITING,
        items
      },
      id
    );
  }
}
