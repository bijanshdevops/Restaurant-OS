import { AggregateRoot } from '@/shared/domain/AggregateRoot';
import { CustomerPurchaseRecordedEvent } from '../events/CustomerPurchaseRecordedEvent';

export class CustomerProfile extends AggregateRoot<string> {
  private _tenantId: string;
  private _customerContact: string; // Masked
  private _totalSpent: number;
  private _lastPurchaseDate: Date;
  private _segment: string;

  private constructor(
    id: string,
    tenantId: string,
    customerContact: string,
    totalSpent: number,
    lastPurchaseDate: Date,
    segment: string
  ) {
    super({} as string, id);
    this._tenantId = tenantId;
    this._customerContact = customerContact;
    this._totalSpent = totalSpent;
    this._lastPurchaseDate = lastPurchaseDate;
    this._segment = segment;
  }

  public static create(
    id: string,
    tenantId: string,
    rawContact: string
  ): CustomerProfile {
    return new CustomerProfile(
      id,
      tenantId,
      CustomerProfile.maskContact(rawContact),
      0,
      new Date(),
      'REGULAR'
    );
  }

  public static from(
    id: string,
    tenantId: string,
    customerContact: string,
    totalSpent: number,
    lastPurchaseDate: Date,
    segment: string
  ): CustomerProfile {
    return new CustomerProfile(id, tenantId, customerContact, totalSpent, lastPurchaseDate, segment);
  }

  /**
   * Domain Logic: Process a new order
   */
  public recordPurchase(amount: number): void {
    if (amount <= 0) return;

    this._totalSpent += amount;
    this._lastPurchaseDate = new Date();

    // Re-evaluate segment
    const oldSegment = this._segment;
    this.evaluateSegment();

    // We emit an event to notify downstream analytics or marketing systems
    this.addDomainEvent(new CustomerPurchaseRecordedEvent(
      this._tenantId,
      this.id,
      this._segment,
      amount
    ));
  }

  private evaluateSegment(): void {
    if (this._totalSpent > 500) {
      this._segment = 'VIP';
    } else {
      this._segment = 'REGULAR';
    }
  }

  /**
   * Masks email or phone number.
   * E.g. john.doe@example.com -> jo***@example.com
   * E.g. 555-1234 -> 555-****
   */
  private static maskContact(contact: string): string {
    if (!contact) return 'UNKNOWN';
    if (contact.includes('@')) {
      return contact.replace(/(?<=.{2}).(?=[^@]*?@)/g, '*');
    }
    // Fallback simple masking for phones/names (keep first 3, mask rest)
    if (contact.length > 4) {
      return contact.substring(0, 3) + '*'.repeat(contact.length - 3);
    }
    return '***';
  }

  get tenantId(): string { return this._tenantId; }
  get customerContact(): string { return this._customerContact; }
  get totalSpent(): number { return this._totalSpent; }
  get lastPurchaseDate(): Date { return this._lastPurchaseDate; }
  get segment(): string { return this._segment; }
}
