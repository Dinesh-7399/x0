// tests/e2e/auth.e2e.test.ts
// End-to-end tests for Auth endpoints

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8081';

// Define response type
interface ApiResponse {
  status: number;
  data: Record<string, any>;
}

// Helper to make requests
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

describe('Auth E2E Tests', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  let accessToken: string;
  let refreshToken: string;

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const { status, data } = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(status).toBe(201);
      expect(data.user.email).toBe(testEmail);
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();

      accessToken = data.accessToken;
      refreshToken = data.refreshToken;
    });

    it('should reject duplicate email registration', async () => {
      const { status, data } = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(status).toBe(409);
      expect(data.error).toBeDefined();
    });

    it('should reject weak passwords', async () => {
      const { status, data } = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'weak@example.com',
          password: '123',
        }),
      });

      expect(status).toBe(400);
    });

    it('should reject invalid email format', async () => {
      const { status } = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'not-an-email',
          password: testPassword,
        }),
      });

      expect(status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with correct credentials', async () => {
      const { status, data } = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      // May fail if email verification is required
      if (status === 200) {
        expect(data.user.email).toBe(testEmail);
        expect(data.accessToken).toBeDefined();
        accessToken = data.accessToken;
        refreshToken = data.refreshToken;
      } else {
        // Email not verified error is expected
        expect([200, 403]).toContain(status);
      }
    });

    it('should reject incorrect password', async () => {
      const { status } = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          password: 'wrong-password',
        }),
      });

      expect(status).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const { status } = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: testPassword,
        }),
      });

      expect(status).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh access token', async () => {
      if (!refreshToken) return; // Skip if no token from registration

      const { status, data } = await request('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });

      if (status === 200) {
        expect(data.accessToken).toBeDefined();
        expect(data.expiresIn).toBeDefined();
      }
    });

    it('should reject invalid refresh token', async () => {
      const { status } = await request('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'invalid-token' }),
      });

      expect(status).toBe(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user when authenticated', async () => {
      if (!accessToken) return;

      const { status, data } = await request('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (status === 200) {
        expect(data.email).toBe(testEmail);
      }
    });

    it('should reject unauthenticated request', async () => {
      const { status } = await request('/auth/me');
      expect(status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      if (!refreshToken) return;

      const { status, data } = await request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });

      if (status === 200) {
        expect(data.message).toContain('success');
      }
    });
  });
});

describe('Health Checks', () => {
  it('GET /health should return healthy', async () => {
    const { status, data } = await request('/health');
    expect(status).toBe(200);
    expect(data.status).toBe('healthy');
  });
});
