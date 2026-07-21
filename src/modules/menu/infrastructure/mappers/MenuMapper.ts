import { Menu } from '../../domain/aggregates/Menu';
import { MenuItem } from '../../domain/entities/MenuItem';
import { Money } from '../../../../shared/domain/value-objects/Money';

export class MenuMapper {
  /**
   * Reconstructs the rich Menu Aggregate from a raw Prisma database result.
   */
  public static toDomain(raw: any): Menu {
    const items = (raw.items || []).map((rawItem: any) => {
      // Reconstitute the Value Object
      const price = (Money as any).create(rawItem.priceAmount, rawItem.priceCurrency);
      
      // Bypass the private constructor to hydrate the Entity without triggering domain logic
      const item = new (MenuItem as any)({
        title: rawItem.title,
        description: rawItem.description,
        price: price,
        isActive: rawItem.isActive
      }, rawItem.id);
      
      return item;
    });

    // Bypass the private constructor to hydrate the Aggregate Root
    const menu = new (Menu as any)({
      title: raw.title,
      status: raw.status,
      items: items
    }, raw.id);
    
    return menu;
  }

  /**
   * Extracts data from the Menu Aggregate into a flat structure suitable for Prisma.
   */
  public static toPersistence(menu: Menu): any {
    return {
      id: menu.id,
      title: menu.title,
      status: menu.status,
      items: menu.items.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        priceAmount: item.price.amount,
        priceCurrency: item.price.currency,
        isActive: item.isActive
      }))
    };
  }
}
