// tests/setup.ts
// Test configuration and utilities

export const TEST_CONFIG = {
  identityServiceUrl: process.env.IDENTITY_SERVICE_URL || 'http://localhost:8081',
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:8082',
  gymServiceUrl: process.env.GYM_SERVICE_URL || 'http://localhost:8083',
  apiGatewayUrl: process.env.API_GATEWAY_URL || 'http://localhost:80',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://gymato:gymato_dev@localhost:5432/gymato',
};

// Generate unique test email
export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
}

// HTTP request helper
export async function httpRequest(
  baseUrl: string,
  path: string,
  options: RequestInit = {}
): Promise<{ status: number; data: any }> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

// Wait for service to be healthy
export async function waitForService(url: string, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) return true;
    } catch {
      // Service not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}
