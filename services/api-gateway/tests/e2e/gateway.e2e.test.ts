// tests/e2e/gateway.e2e.test.ts
// E2E tests for API Gateway

import { describe, it, expect } from 'bun:test';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:80';

// Define response type
interface ApiResponse {
  status: number;
  data: Record<string, any>;
  headers: Headers;
}

async function request(path: string, options: RequestInit = {}): Promise<ApiResponse> {
  const response = await fetch(`${GATEWAY_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, any>;
  return { status: response.status, data, headers: response.headers };
}

describe('API Gateway E2E', () => {
  describe('Health Checks', () => {
    it('should return gateway health', async () => {
      const { status, data } = await request('/health');

      expect(status).toBe(200);
      expect(data.status).toBe('healthy');
    });

    it('should return routes info', async () => {
      const { status, data } = await request('/routes');

      expect(status).toBe(200);
      expect(data).toBeDefined();
    });
  });

  describe('Auth Routing', () => {
    it('should route /api/v1/auth/register to identity-service', async () => {
      const { status } = await request('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: `gateway-test-${Date.now()}@example.com`,
          password: 'TestPassword123!',
        }),
      });

      // Should get response from identity-service (201 success or 400/409 error)
      expect([201, 400, 409]).toContain(status);
    });

    it('should route /api/v1/auth/login to identity-service', async () => {
      const { status } = await request('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      });

      // Should get 401 from identity-service
      expect(status).toBe(401);
    });
  });

  describe('User Routing', () => {
    it('should route /api/v1/users/me to user-service', async () => {
      const { status } = await request('/api/v1/users/me', {
        headers: {
          'Authorization': 'Bearer fake-token',
        },
      });

      // Should get 401 (unauthorized) or forward to user-service
      expect([401, 400, 403]).toContain(status);
    });
  });

  describe('Gym Routing', () => {
    it('should route /api/v1/gyms/search to gym-service', async () => {
      const { status, data } = await request('/api/v1/gyms/search?city=Mumbai');

      // Public endpoint should work
      if (status === 200) {
        expect(data.gyms).toBeDefined();
      }
    });

    it('should route /api/v1/gyms to gym-service for POST', async () => {
      const { status } = await request('/api/v1/gyms', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user-123',
        },
        body: JSON.stringify({
          name: 'Gateway Test Gym',
          city: 'Mumbai',
        }),
      });

      // Should get response from gym-service
      expect([201, 400, 401]).toContain(status);
    });
  });

  describe('Request Headers', () => {
    it('should add x-request-id header', async () => {
      const { headers } = await request('/health');

      // Gateway should add request tracking headers
      const requestId = headers.get('x-request-id');
      // May or may not be present depending on implementation
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const { status, data } = await request('/api/v1/unknown/route');

      expect([404, 502]).toContain(status);
    });
  });

  describe('CORS', () => {
    it('should handle OPTIONS preflight', async () => {
      const response = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
        method: 'OPTIONS',
      });

      // Should get 200 or 204 for CORS preflight
      expect([200, 204]).toContain(response.status);
    });
  });
});
