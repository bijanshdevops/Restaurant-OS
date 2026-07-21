import { CreateMenuCommand } from '../commands/CreateMenuCommand';
import { IMenuRepository } from '../ports/IMenuRepository';
import { Menu } from '../../domain/aggregates/Menu';
import { randomUUID } from 'crypto';

export class CreateMenuUseCase {
  constructor(private readonly menuRepository: IMenuRepository) {}

  public async execute(command: CreateMenuCommand): Promise<string> {
    // Generate a unique ID for the new Menu
    const id = randomUUID();
    
    // Instantiate a new Menu aggregate.
    // Note: tenantId and description from the command could be added to the Menu aggregate 
    // in future iterations, or used to set the current tenant context for the repository.
    const menu = Menu.create(command.title, id);
    
    // Persist the aggregate via the Output Port
    await this.menuRepository.save(menu);
    
    return id;
  }
}
