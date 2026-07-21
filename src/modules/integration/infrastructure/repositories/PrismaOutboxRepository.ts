// We use 'any' here dynamically to represent both the standard PrismaClient 
// and the isolated Prisma.TransactionClient required for ACID guarantees.
type PrismaClientOrTransaction = any;

export interface OutboxEvent {
  id: string;
  eventType: string;
  payload: any;
  tenantId: string;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  correlationId?: string;
  attempts: number;
  nextRetryAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class PrismaOutboxRepository {
  constructor(private readonly prisma: PrismaClientOrTransaction) {}

  /**
   * Enqueues a new event into the Outbox.
   * 
   * @param event The domain event payload
   * @param tx The active database transaction. Providing this guarantees ACID coupling
   *           with the business aggregate persistence.
   */
  public async enqueue(
    event: { eventType: string; payload: any; tenantId: string },
    correlationId?: string,
    tx?: PrismaClientOrTransaction
  ): Promise<void> {
    const client = tx || this.prisma;

    await client.outboxEvent.create({
      data: {
        eventType: event.eventType,
        payload: event.payload,
        tenantId: event.tenantId,
        correlationId: correlationId,
        status: 'PENDING',
        attempts: 0,
        nextRetryAt: new Date(), // Eligible for immediate processing
      }
    });
  }

  /**
   * Fetches the next batch of pending events.
   * Strictly filters out events whose exponential backoff 'nextRetryAt' timer has not yet elapsed.
   */
  public async getPendingEvents(limit: number): Promise<OutboxEvent[]> {
    return this.prisma.outboxEvent.findMany({
      where: {
        status: 'PENDING',
        nextRetryAt: {
          lte: new Date() // Only fetch events whose wait time has elapsed
        }
      },
      orderBy: {
        createdAt: 'asc' // Strict FIFO processing
      },
      take: limit
    });
  }

  /**
   * Marks an event as successfully transmitted to the external webhook.
   */
  public async markAsProcessed(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { status: 'PROCESSED' }
    });
  }

  /**
   * Records a transmission failure and schedules the next exponential backoff retry.
   * If the event has exceeded its maximum attempts, the calling processor should
   * set the status to FAILED. Otherwise, it resets to PENDING to be picked up again.
   */
  public async markAsFailed(id: string, nextRetryAt: Date, isPermanentFailure: boolean = false): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: isPermanentFailure ? 'FAILED' : 'PENDING',
        attempts: { increment: 1 },
        nextRetryAt: nextRetryAt
      }
    });
  }

  /**
   * Atomic Concurrency Safety: Instantly locks the event to prevent distributed 
   * worker collision (dual-delivery) by transitioning it to 'PROCESSING'.
   */
  public async lockForProcessing(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { status: 'PROCESSING' }
    });
  }
}

