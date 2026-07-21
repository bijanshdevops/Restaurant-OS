import { Menu } from '../../domain/aggregates/Menu';

export interface IMenuRepository {
  save(menu: Menu): Promise<void>;
  findById(id: string): Promise<Menu | null>;
}
