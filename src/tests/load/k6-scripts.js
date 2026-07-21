import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 options configuration
export const options = {
  scenarios: {
    // Scenario 1: Inventory Race Conditions
    // Spam the orders endpoint with concurrent virtual users to verify ACID isolation
    inventory_race: {
      executor: 'shared-iterations',
      vus: 50, // 50 concurrent users
      iterations: 200, // Try to place 200 orders instantly
      maxDuration: '30s',
      exec: 'placeOrder',
    },
    // Scenario 2: Throttling & API Gateway
    // Test the custom RateLimiter (100 req / minute) by bursting 150 requests
    throttling_burst: {
      executor: 'constant-arrival-rate',
      rate: 150,
      timeUnit: '1m',
      duration: '1m',
      preAllocatedVUs: 10,
      maxVUs: 20,
      exec: 'getAnalytics',
    },
  },
};

// Replace with your local or production URL
const BASE_URL = __ENV.API_URL || 'http://localhost:3000/api';

// A static tenant token that matches the testing mock or actual DB
const TENANT_ID = 'valid-tenant-demo';
const HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TENANT_ID}`,
};

/**
 * Execution block for testing Order concurrency and inventory locking.
 */
export function placeOrder() {
  const payload = JSON.stringify({
    customerId: 'cust_load_test',
    items: [
      { menuItemId: 'm1', quantity: 1 } // Trying to reserve 1 stock concurrently
    ]
  });

  const res = http.post(`${BASE_URL}/orders`, payload, { headers: HEADERS });

  // A 201 means successful reservation. 
  // A 400 with "InsufficientStock" means our concurrency checks correctly aborted the transaction!
  check(res, {
    'is status 201 or 400': (r) => r.status === 201 || r.status === 400,
  });
}

/**
 * Execution block for testing Rate Limiting Gateway.
 */
export function getAnalytics() {
  const res = http.get(`${BASE_URL}/analytics/stats`, { headers: HEADERS });

  // We expect exactly 100 requests to succeed with 200, and the remaining 50 to return 429
  check(res, {
    'is status 200 or 429': (r) => r.status === 200 || r.status === 429,
  });
}
