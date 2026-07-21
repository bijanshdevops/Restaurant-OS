import { AggregateRoot } from '../../../../shared/domain/AggregateRoot';
import { MenuItem } from '../entities/MenuItem';

type MenuStatus = 'Draft' | 'Published';

interface MenuProps {
  title: string;
  status: MenuStatus;
  items: MenuItem[];
}

export class Menu extends AggregateRoot<MenuProps> {
  private constructor(props: MenuProps, id: string) {
    super(props, id);
  }

  get title(): string {
    return this.props.title;
  }

  get status(): MenuStatus {
    return this.props.status;
  }

  get items(): ReadonlyArray<MenuItem> {
    return this.props.items;
  }

  public addItem(item: MenuItem): void {
    this.props.items.push(item);
  }

  public removeItem(itemId: string): void {
    this.props.items = this.props.items.filter(item => item.id !== itemId);
  }

  public publish(): void {
    if (this.props.items.length === 0) {
      throw new Error("Domain Exception: Cannot publish a menu without items.");
    }
    
    const hasActiveItems = this.props.items.some(item => item.isActive);
    if (!hasActiveItems) {
      throw new Error("Domain Exception: Cannot publish a menu without at least one active item.");
    }

    this.props.status = 'Published';
    this.addDomainEvent({
      name: 'MenuPublishedEvent',
      dateTimeOccurred: new Date(),
    });
  }

  public unpublish(): void {
    this.props.status = 'Draft';
    this.addDomainEvent({
      name: 'MenuUnpublishedEvent',
      dateTimeOccurred: new Date(),
    });
  }

  public static create(title: string, id: string): Menu {
    return new Menu({
      title,
      status: 'Draft',
      items: [],
    }, id);
  }
}
