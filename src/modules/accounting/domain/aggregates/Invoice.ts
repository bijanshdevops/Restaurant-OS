import { AggregateRoot } from '@/shared/domain/AggregateRoot';

export class Invoice extends AggregateRoot<string> {
  private _tenantId: string;
  private _orderId: string;
  private _amount: number;
  private _currency: string;
  private _createdAt: Date;

  private constructor(
    id: string,
    tenantId: string,
    orderId: string,
    amount: number,
    currency: string,
    createdAt: Date
  ) {
    super({} as string, id);
    this._tenantId = tenantId;
    this._orderId = orderId;
    this._amount = amount;
    this._currency = currency;
    this._createdAt = createdAt;
  }

  public static generate(
    id: string,
    tenantId: string,
    orderId: string,
    amount: number,
    currency: string
  ): Invoice {
    if (amount < 0) {
      throw new Error('Domain Exception: Invoice amount cannot be negative.');
    }
    return new Invoice(id, tenantId, orderId, amount, currency, new Date());
  }

  // Hydration factory
  public static from(
    id: string,
    tenantId: string,
    orderId: string,
    amount: number,
    currency: string,
    createdAt: Date
  ): Invoice {
    return new Invoice(id, tenantId, orderId, amount, currency, createdAt);
  }

  get tenantId(): string { return this._tenantId; }
  get orderId(): string { return this._orderId; }
  get amount(): number { return this._amount; }
  get currency(): string { return this._currency; }
  get createdAt(): Date { return this._createdAt; }
}
