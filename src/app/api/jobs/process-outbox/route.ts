import { NextResponse } from 'next/server';
import { makeOutboxProcessor } from '@/modules/integration/presentation/factories/OutboxProcessorFactory';

/**
 * Endpoint designed exclusively for Serverless Cron execution (e.g., Vercel Cron or GitHub Actions).
 * Executes the Outbox Processor to systematically drain the webhook queue.
 */
export async function GET(request: Request) {
  // 1. Stringent Security Validation: Prevent public execution
  const authHeader = request.headers.get('x-cron-secret');
  
  if (!process.env.CRON_SECRET) {
    console.error('[CRON] Security vulnerability: CRON_SECRET is not defined in environment.');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

  // Cryptographic time-constant comparison is ideal here, but exact match serves as baseline security
  if (authHeader !== process.env.CRON_SECRET) {
    console.warn('[CRON] Unauthorized access attempt blocked on /api/jobs/process-outbox.');
    return NextResponse.json({ error: 'Unauthorized: Invalid cron secret' }, { status: 401 });
  }

  try {
    // 2. Factory Instantiation: Spin up the completely stateless Processor engine
    const processor = makeOutboxProcessor();

    // 3. Execution: Command the processor to process the next 100 eligible events
    // Due to the 'lockForProcessing' atomic update, if Vercel fires two duplicate cron hits simultaneously,
    // they will elegantly share the load without dual-delivering webhooks.
    const processedCount = await processor.process(100);

    // 4. Agnostic Success Response
    return NextResponse.json({ 
      status: 'success', 
      processedItems: processedCount 
    }, { status: 200 });

  } catch (error) {
    console.error('[CRON] Fatal unhandled error during outbox processing:', error);
    // Explicitly masking internal database errors from HTTP output
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
