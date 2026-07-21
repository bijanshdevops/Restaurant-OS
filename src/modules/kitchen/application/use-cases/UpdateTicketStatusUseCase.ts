import { IKitchenTicketRepository } from '../ports/IKitchenTicketRepository';
import { PreparationStatus } from '../../domain/value-objects/PreparationStatus';

export class UpdateTicketStatusUseCase {
  constructor(private readonly kitchenTicketRepository: IKitchenTicketRepository) {}

  public async execute(ticketId: string, status: PreparationStatus): Promise<void> {
    // 1. Fetch the ticket (tenant isolation is automatically enforced by the Repository implementation)
    const ticket = await this.kitchenTicketRepository.findById(ticketId);

    if (!ticket) {
      throw new Error("Domain Exception: Kitchen ticket not found.");
    }

    // 2. Delegate state transition logic to the Domain Aggregate
    if (status === PreparationStatus.IN_PROGRESS) {
      ticket.startPreparation();
    } else if (status === PreparationStatus.READY) {
      ticket.completePreparation();
    } else {
      throw new Error(`Domain Exception: Invalid state transition target ${status}.`);
    }

    // 3. Persist the updated ticket
    await this.kitchenTicketRepository.save(ticket);
  }
}
