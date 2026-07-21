import { PrismaClient } from '@prisma/client';

// Implement the Singleton pattern to ensure we don't exhaust database connections,
// which is a common issue in Next.js/Node.js development due to hot-reloading.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prismaClient: PrismaClient =
  globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaClient;
}
