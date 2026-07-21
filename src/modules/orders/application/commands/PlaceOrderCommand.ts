export interface PlaceOrderCommand {
  readonly tenantId: string;
  readonly customerId?: string;
  readonly items: ReadonlyArray<{
    readonly menuItemId: string;
    readonly quantity: number;
  }>;
}
