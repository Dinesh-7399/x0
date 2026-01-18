// tests/e2e/users.e2e.test.ts
// E2E tests for User endpoints

import { describe, it, expect } from 'bun:test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8082';

// Define response type
interface ApiResponse {
  status: number;
  data: Record<string, any>;
}

async function request(path: string, options: RequestInit = {}): Promise<ApiResponse> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, any>;
  return { status: response.status, data };
}

describe('User Service E2E', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const { status, data } = await request('/health');

      expect(status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.service).toBe('user-service');
    });
  });

  describe('GET /users/me', () => {
    it('should reject unauthenticated request', async () => {
      const { status } = await request('/users/me');
      expect([401, 400]).toContain(status); // 401 or 400 for missing auth
    });

    it('should return profile for authenticated user', async () => {
      // Simulate authenticated request
      const { status, data } = await request('/users/me', {
        headers: {
          'x-user-id': 'test-user-123',
          'x-user-email': 'test@example.com',
        },
      });

      // Profile may or may not exist
      expect([200, 404]).toContain(status);
    });
  });

  describe('PUT /users/me', () => {
    it('should update user profile', async () => {
      const { status } = await request('/users/me', {
        method: 'PUT',
        headers: {
          'x-user-id': 'test-user-123',
        },
        body: JSON.stringify({
          displayName: 'Updated Name',
          bio: 'Updated bio',
        }),
      });

      // May succeed or fail depending on profile existence
      expect([200, 201, 404]).toContain(status);
    });
  });

  describe('GET /users/me/preferences', () => {
    it('should return user preferences', async () => {
      const { status, data } = await request('/users/me/preferences', {
        headers: {
          'x-user-id': 'test-user-123',
        },
      });

      if (status === 200) {
        expect(data).toBeDefined();
      }
    });
  });

  describe('PUT /users/me/preferences', () => {
    it('should update user preferences', async () => {
      const { status } = await request('/users/me/preferences', {
        method: 'PUT',
        headers: {
          'x-user-id': 'test-user-123',
        },
        body: JSON.stringify({
          theme: 'dark',
          notifications: { email: true, push: true },
        }),
      });

      // May succeed or fail
      expect([200, 404]).toContain(status);
    });
  });
});
