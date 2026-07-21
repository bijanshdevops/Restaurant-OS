import { KitchenTicket } from '../../domain/aggregates/KitchenTicket';

export interface IKitchenTicketRepository {
  save(ticket: KitchenTicket): Promise<void>;
  findById(id: string): Promise<KitchenTicket | null>;
}
