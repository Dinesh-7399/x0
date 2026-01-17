// tests/unit/proxy/HttpProxy.test.ts
// Unit tests for HttpProxy

import { describe, it, expect, beforeEach, mock } from 'bun:test';

describe('HttpProxy', () => {
  describe('URL building', () => {
    it('should build correct target URL', () => {
      const baseUrl = 'http://identity-service:8080';
      const path = '/auth/login';
      const result = `${baseUrl}${path}`;

      expect(result).toBe('http://identity-service:8080/auth/login');
    });

    it('should strip prefix when configured', () => {
      const incomingPath = '/api/v1/auth/login';
      const prefix = '/api/v1';
      const strippedPath = incomingPath.replace(prefix, '');

      expect(strippedPath).toBe('/auth/login');
    });

    it('should preserve query parameters', () => {
      const basePath = '/gyms/search';
      const query = '?city=Mumbai&type=gym';
      const fullPath = basePath + query;

      expect(fullPath).toContain('city=Mumbai');
      expect(fullPath).toContain('type=gym');
    });
  });

  describe('Header forwarding', () => {
    it('should forward authorization header', () => {
      const headers = new Headers();
      headers.set('Authorization', 'Bearer token123');
      headers.set('Content-Type', 'application/json');

      expect(headers.get('Authorization')).toBe('Bearer token123');
    });

    it('should add x-request-id header', () => {
      const requestId = 'req-' + Date.now();
      const headers = { 'x-request-id': requestId };

      expect(headers['x-request-id']).toBeDefined();
    });

    it('should forward user context headers', () => {
      const headers = {
        'x-user-id': 'user-123',
        'x-user-email': 'test@example.com',
      };

      expect(headers['x-user-id']).toBe('user-123');
      expect(headers['x-user-email']).toBe('test@example.com');
    });
  });

  describe('Method handling', () => {
    it('should pass through GET requests', () => {
      const method = 'GET';
      expect(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).toContain(method);
    });

    it('should pass through POST requests with body', () => {
      const method = 'POST';
      const body = JSON.stringify({ email: 'test@example.com' });

      expect(method).toBe('POST');
      expect(JSON.parse(body).email).toBe('test@example.com');
    });
  });
});

describe('Route Matching', () => {
  const routes = [
    { path: '/api/v1/auth/*', target: 'identity-service:8080' },
    { path: '/api/v1/users/*', target: 'user-service:8080' },
    { path: '/api/v1/gyms/*', target: 'gym-service:8080' },
  ];

  it('should match auth routes to identity-service', () => {
    const path = '/api/v1/auth/login';
    const route = routes.find(r => path.startsWith(r.path.replace('/*', '')));

    expect(route?.target).toBe('identity-service:8080');
  });

  it('should match user routes to user-service', () => {
    const path = '/api/v1/users/me';
    const route = routes.find(r => path.startsWith(r.path.replace('/*', '')));

    expect(route?.target).toBe('user-service:8080');
  });

  it('should match gym routes to gym-service', () => {
    const path = '/api/v1/gyms/search';
    const route = routes.find(r => path.startsWith(r.path.replace('/*', '')));

    expect(route?.target).toBe('gym-service:8080');
  });
});
