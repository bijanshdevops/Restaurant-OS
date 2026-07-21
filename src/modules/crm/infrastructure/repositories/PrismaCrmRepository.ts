import { CustomerProfile } from '../../domain/aggregates/CustomerProfile';

export class PrismaCrmRepository {
  constructor(private readonly prisma: any) {}

  public async findById(tenantId: string, id: string): Promise<CustomerProfile | null> {
    const record = await this.prisma.customerProfile.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id
        }
      }
    });

    if (!record) return null;

    return CustomerProfile.from(
      record.id,
      record.tenantId,
      record.customerContact,
      record.totalSpent,
      record.lastPurchaseDate,
      record.segment
    );
  }

  public async save(profile: CustomerProfile): Promise<void> {
    await this.prisma.customerProfile.upsert({
      where: {
        tenantId_id: {
          tenantId: profile.tenantId,
          id: profile.id
        }
      },
      update: {
        totalSpent: profile.totalSpent,
        lastPurchaseDate: profile.lastPurchaseDate,
        segment: profile.segment
      },
      create: {
        id: profile.id,
        tenantId: profile.tenantId,
        customerContact: profile.customerContact,
        totalSpent: profile.totalSpent,
        lastPurchaseDate: profile.lastPurchaseDate,
        segment: profile.segment
      }
    });
  }
}
