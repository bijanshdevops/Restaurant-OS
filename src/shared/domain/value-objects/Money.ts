import { ValueObject } from '../ValueObject';

interface MoneyProps {
  amount: number;
  currency: string;
}

export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  public static create(amount: number, currency: string = 'USD'): Money {
    if (amount < 0) {
      throw new Error("Money amount cannot be negative.");
    }
    return new Money({ amount, currency });
  }

  // Addition utility for order totals
  public add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error("Cannot add money with different currencies.");
    }
    return Money.create(this.amount + other.amount, this.currency);
  }

  // Multiplication utility for line items (price * quantity)
  public multiply(multiplier: number): Money {
    if (multiplier < 0) {
      throw new Error("Multiplier cannot be negative.");
    }
    return Money.create(this.amount * multiplier, this.currency);
  }
}
