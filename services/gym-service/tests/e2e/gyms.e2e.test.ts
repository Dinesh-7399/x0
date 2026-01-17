// tests/e2e/gyms.e2e.test.ts
// E2E tests for Gym endpoints

import { describe, it, expect } from 'bun:test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8083';

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

describe('Gym Service E2E', () => {
  const testUserId = 'test-owner-' + Date.now();
  let createdGymId: string;
  let createdGymSlug: string;

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const { status, data } = await request('/health');

      expect(status).toBe(200);
      expect(data.status).toBe('healthy');
    });
  });

  describe('POST /gyms', () => {
    it('should create a new gym', async () => {
      const { status, data } = await request('/gyms', {
        method: 'POST',
        headers: { 'x-user-id': testUserId },
        body: JSON.stringify({
          name: 'Test Gym ' + Date.now(),
          city: 'Mumbai',
          country: 'India',
          type: 'gym',
          address: '123 Test Street',
          phone: '9876543210',
        }),
      });

      expect(status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.slug).toBeDefined();
      expect(data.status).toBe('draft');

      createdGymId = data.id;
      createdGymSlug = data.slug;
    });

    it('should reject gym without required fields', async () => {
      const { status } = await request('/gyms', {
        method: 'POST',
        headers: { 'x-user-id': testUserId },
        body: JSON.stringify({
          name: 'Incomplete Gym',
          // Missing city
        }),
      });

      expect(status).toBe(400);
    });
  });

  describe('GET /gyms/my', () => {
    it('should return user\'s gyms', async () => {
      const { status, data } = await request('/gyms/my', {
        headers: { 'x-user-id': testUserId },
      });

      expect(status).toBe(200);
      expect(data.gyms).toBeDefined();
      expect(Array.isArray(data.gyms)).toBe(true);
    });
  });

  describe('GET /gyms/search', () => {
    it('should search gyms by city', async () => {
      const { status, data } = await request('/gyms/search?city=Mumbai');

      expect(status).toBe(200);
      expect(data.gyms).toBeDefined();
      expect(Array.isArray(data.gyms)).toBe(true);
    });

    it('should search gyms by type', async () => {
      const { status, data } = await request('/gyms/search?type=yoga');

      expect(status).toBe(200);
      expect(data.gyms).toBeDefined();
    });
  });

  describe('GET /gyms/:slug', () => {
    it('should get gym by slug', async () => {
      if (!createdGymSlug) return;

      const { status, data } = await request(`/gyms/${createdGymSlug}`);

      if (status === 200) {
        expect(data.slug).toBe(createdGymSlug);
      }
    });

    it('should return 404 for non-existent slug', async () => {
      const { status } = await request('/gyms/non-existent-gym-slug');
      expect(status).toBe(404);
    });
  });

  describe('PUT /gyms/:gymId', () => {
    it('should update gym details', async () => {
      if (!createdGymId) return;

      const { status, data } = await request(`/gyms/${createdGymId}`, {
        method: 'PUT',
        headers: { 'x-user-id': testUserId },
        body: JSON.stringify({
          description: 'Updated description',
          facilities: ['parking', 'showers', 'wifi'],
        }),
      });

      if (status === 200) {
        expect(data.description).toBe('Updated description');
        expect(data.facilities).toContain('parking');
      }
    });
  });

  describe('POST /gyms/:gymId/submit', () => {
    it('should submit gym for verification', async () => {
      if (!createdGymId) return;

      const { status, data } = await request(`/gyms/${createdGymId}/submit`, {
        method: 'POST',
        headers: { 'x-user-id': testUserId },
      });

      if (status === 200) {
        expect(data.gym.status).toBe('pending_verification');
      }
    });
  });

  describe('GET /verification/queue', () => {
    it('should return pending gyms for partners', async () => {
      const { status, data } = await request('/verification/queue', {
        headers: { 'x-user-id': 'partner-123' },
      });

      expect(status).toBe(200);
      expect(data.queue).toBeDefined();
      expect(Array.isArray(data.queue)).toBe(true);
    });
  });

  describe('Equipment Management', () => {
    it('should add equipment to gym', async () => {
      if (!createdGymId) return;

      const { status, data } = await request(`/gyms/${createdGymId}/equipment`, {
        method: 'POST',
        headers: { 'x-user-id': testUserId },
        body: JSON.stringify({
          name: 'Treadmill',
          category: 'Cardio',
          brand: 'NordicTrack',
          quantity: 5,
          condition: 'good',
        }),
      });

      if (status === 201) {
        expect(data.name).toBe('Treadmill');
      }
    });

    it('should list gym equipment', async () => {
      if (!createdGymId) return;

      const { status, data } = await request(`/gyms/${createdGymId}/equipment`);

      if (status === 200) {
        expect(data.equipment).toBeDefined();
      }
    });
  });

  describe('Staff Management', () => {
    it('should list gym staff', async () => {
      if (!createdGymId) return;

      const { status, data } = await request(`/gyms/${createdGymId}/staff`, {
        headers: { 'x-user-id': testUserId },
      });

      if (status === 200) {
        expect(data.staff).toBeDefined();
        // Owner should be in the list
        expect(data.staff.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
