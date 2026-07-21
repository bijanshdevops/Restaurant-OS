import { CorrelationContext } from './CorrelationContext';

/**
 * A lightweight logger proxy that automatically appends the Distributed Tracing
 * Correlation ID to all log lines. In a real environment, this could wrap Winston or Pino.
 */
export const logger = {
  info: (message: string, meta: any = {}) => {
    const correlationId = CorrelationContext.getId();
    console.log(JSON.stringify({ level: 'info', message, correlationId, ...meta }));
  },
  warn: (message: string, meta: any = {}) => {
    const correlationId = CorrelationContext.getId();
    console.warn(JSON.stringify({ level: 'warn', message, correlationId, ...meta }));
  },
  error: (message: string, error?: any, meta: any = {}) => {
    const correlationId = CorrelationContext.getId();
    console.error(JSON.stringify({ 
      level: 'error', 
      message, 
      correlationId, 
      error: error?.message || error, 
      stack: error?.stack,
      ...meta 
    }));
  }
};
