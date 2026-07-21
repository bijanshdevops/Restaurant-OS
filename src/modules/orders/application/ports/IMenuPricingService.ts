import { Money } from '../../../../shared/domain/value-objects/Money';

/**
 * Port (Interface) defining how the Orders module requests data from the Menu boundary.
 * Using an interface here prevents tight coupling; the Orders application layer 
 * does not know if this is resolved via a direct service call, a database read, or an API call.
 */
export interface IMenuPricingService {
  getPrice(menuItemId: string, tenantId: string): Promise<Money>;
}
