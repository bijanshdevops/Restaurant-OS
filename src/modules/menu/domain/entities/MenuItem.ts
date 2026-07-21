import { Entity } from '../../../../shared/domain/Entity';
import { Money } from '../../../../shared/domain/value-objects/Money';

interface MenuItemProps {
  title: string;
  description: string;
  price: Money;
  isActive: boolean;
}

export class MenuItem extends Entity<MenuItemProps> {
  private constructor(props: MenuItemProps, id: string) {
    super(props, id);
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string {
    return this.props.description;
  }

  get price(): Money {
    return this.props.price;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  public changePrice(newPrice: Money): void {
    this.props.price = newPrice;
  }

  public deactivate(): void {
    this.props.isActive = false;
  }
  
  public activate(): void {
    this.props.isActive = true;
  }

  public static create(props: Omit<MenuItemProps, 'isActive'>, id: string): MenuItem {
    return new MenuItem({
      ...props,
      isActive: true, // MenuItems are active by default upon creation
    }, id);
  }
}
