import { Order } from '../../domain/aggregates/Order';

export interface IOrderRepository {
  save(order: Order, tx?: any): Promise<void>;
  findById(id: string): Promise<Order | null>;
}
