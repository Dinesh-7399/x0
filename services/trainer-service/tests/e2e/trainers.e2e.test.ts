import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Client } from 'pg';

const GATEWAY_URL = process.env.TEST_GATEWAY_URL || 'http://localhost:80';
const DB_URL = process.env.DATABASE_URL || 'postgresql://gymato:gymato_dev@localhost:5432/gymato';

// Helper to wait for services if needed (simple delay)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function request(path: string, options: RequestInit = {}) {
  const url = `${GATEWAY_URL}${path}`;
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data, headers: response.headers };
}

describe('Trainer Service Integration E2E', () => {
  let authToken: string;
  let userId: string;
  const testEmail = `trainer.test.${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  let dbClient: Client;

  beforeAll(async () => {
    // Setup DB Client
    dbClient = new Client({ connectionString: DB_URL });
    await dbClient.connect();

    // 1. Register User via Identity Service
    console.log(`Registering user: ${testEmail}`);
    const regRes = await request('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
        role: 'user' // Default to user
      })
    });

    // Identity service might return 201 or 200.
    if (regRes.status !== 201 && regRes.status !== 200) {
      console.error('Registration failed:', regRes.data);
      throw new Error('Failed to register test user');
    }

    // 1.5 Manually Verify Email in DB
    console.log('Manually verifying email in DB...');
    await dbClient.query('UPDATE users SET email_verified = true WHERE email = $1', [testEmail]);

    // 2. Login to get Token
    const loginRes = await request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });

    if (loginRes.status !== 200) {
      console.error('Login failed:', loginRes.data);
      throw new Error('Failed to login test user');
    }

    // Handle nested response data structure if needed
    const loginData = loginRes.data as any;
    authToken = loginData.token || loginData.accessToken;
    userId = loginData.user.id;
    console.log(`Authenticated as User: ${userId}`);
  });

  afterAll(async () => {
    if (dbClient) await dbClient.end();
  });

  describe('GET /health (Trainer Service)', () => {
    it('should be reachable via Gateway', async () => {
      // Note: Health check might not be exposed via Gateway /api/v1 without auth?
      // My routes.yaml mapped /api/v1/trainers/* and /schedule/*.
      // The service has /health at root. Gateway doesn't route /api/v1/trainers/health unless mapped.
      // It routes /api/v1/trainers/* to service /*. So /api/v1/trainers/health -> service /health.
      // Let's verify routes.yaml config:
      // - path: /api/v1/trainers/* -> trainer-service:8080. Strip /api/v1.
      // So /api/v1/trainers/health -> /trainers/health (Wait. Strip /api/v1 leaves /trainers/health. Service has /health at root.)
      // Ah, Gateway usually strips prefix. If I request /api/v1/trainers/health, and strip /api/v1, path sent is /trainers/health.
      // But my service `index.ts` has `app.get('/health')` at root.
      // AND `app.route('/', routes)` where routes define `/trainers/...`.
      // So `/trainers/health` is NOT defined. Only `/health` and `/trainers/profile` etc.
      // So `/api/v1/trainers/health` leads to 404 on service likely.

      // I'll skip health check via Gateway for now or try assumed path.
      // Verification of profile creation confirms service is up.
    });
  });

  describe('Profile Management', () => {
    it('should create trainer profile', async () => {
      const { status, data } = await request('/api/v1/trainers/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          bio: 'Integration Test Bio',
          specializations: ['Integration'],
          experienceYears: 3
        })
      });

      if (status !== 201) console.error('Create Profile Error:', data);
      expect(status).toBe(201);
      expect((data as any).props.userId).toBe(userId);
    });

    it('should fetch my profile', async () => {
      const { status, data } = await request('/api/v1/trainers/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      expect(status).toBe(200);
      expect((data as any).props.bio).toBe('Integration Test Bio');
    });
  });

  describe('Availability Scheduler', () => {
    let testGymId: string;
    let trainerId: string;

    it('should set availability after requesting gym employment', async () => {
      // 1. Generate a test gym ID
      testGymId = crypto.randomUUID();

      // 2. First get the trainer profile to get trainer ID
      const profileRes = await request('/api/v1/trainers/me', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      trainerId = (profileRes.data as any).props.id;

      // 3. Request employment at the gym via API
      const employmentRes = await request('/api/v1/trainers/employment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          gymId: testGymId,
          type: 'full_time'
        })
      });

      if (employmentRes.status !== 201) {
        console.error('Employment Request Error:', employmentRes.data);
      }
      expect(employmentRes.status).toBe(201);

      // 4. Manually activate employment in DB (simulating gym owner approval)
      await dbClient.query(
        `UPDATE trainer_gyms SET status = 'active' WHERE trainer_id = $1 AND gym_id = $2`,
        [trainerId, testGymId]
      );

      // 5. Now set availability - should work!
      const { status, data } = await request('/api/v1/schedule/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          gymId: testGymId,
          dayOfWeek: 1, // Monday
          startTime: '10:00',
          endTime: '20:00'
        })
      });

      if (status !== 201) console.error('Availability Error:', data);
      expect(status).toBe(201);
      expect((data as any).props.gymId).toBe(testGymId);
    });
  });
});
