// src/proxy/HttpProxy.ts
import type { Context } from 'hono';
import type { MatchedRoute } from '../types/route.types.js';
import { logger } from '../core/logger.js';
import { getConfig } from '../config/config.js';

// Type-only imports for Bun types to avoid runtime dependency
type BodyInit = ArrayBuffer | Blob | ReadableStream | string | URLSearchParams | FormData | null;
type HeadersInit = Record<string, string> | Headers | [string, string][];

const config = getConfig();

/**
 * HTTP Proxy
 * Forwards requests to backend services
 */
export class HttpProxy {
  /**
   * Forward request to backend service
   */
  async forward(c: Context, route: MatchedRoute): Promise<Response> {
    // WebSocket routes cannot be proxied with fetch()
    if (route.protocol === 'websocket') {
      logger.warn({ route: route.path }, 'WebSocket proxying not yet implemented');
      return c.json(
        {
          error: 'NOT_IMPLEMENTED',
          message: 'WebSocket proxying requires a separate upgrade handler',
        },
        501,
      );
    }

    const startTime = Date.now();

    // Build target URL
    const targetUrl = this.buildTargetUrl(c.req.url, route);

    // Build request headers
    const headers = this.buildHeaders(c, route);

    // Get request body (if any)
    const body = await this.getRequestBody(c);

    // Determine timeout
    const timeout = route.timeout || config.defaultTimeout;

    const requestLogger = logger.child({
      method: c.req.method,
      path: c.req.path,
      targetUrl,
      route: route.path,
    });

    requestLogger.debug('Forwarding request to backend');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(targetUrl, {
        method: c.req.method,
        headers,
        body,
        signal: controller.signal,
      });

      const duration = Date.now() - startTime;

      requestLogger.info(
        {
          statusCode: response.status,
          duration,
        },
        'Request forwarded successfully',
      );

      // Return response (preserve all headers)
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof Error && error.name === 'AbortError') {
        requestLogger.error({ duration, timeout }, 'Request timeout');

        return c.json(
          {
            error: 'GATEWAY_TIMEOUT',
            message: `Request to ${route.target} timed out after ${timeout}ms`,
          },
          504,
        );
      }

      requestLogger.error({ error, duration }, 'Failed to forward request');

      return c.json(
        {
          error: 'BAD_GATEWAY',
          message: `Failed to connect to ${route.target}`,
          details: config.nodeEnv === 'development' ? (error as Error).message : undefined,
        },
        502,
      );
    } finally {
      // Always clear timeout to avoid leaked timers
      clearTimeout(timeoutId);
    }
  }

  /**
   * Build target URL for backend service
   */
  private buildTargetUrl(originalUrl: string, route: MatchedRoute): string {
    const url = new URL(originalUrl);

    let path = url.pathname;

    // Strip prefix if configured
    if (route.stripPrefix) {
      path = path.replace(route.stripPrefix, '');
    }

    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    // Build target URL (always use http for backend services)
    const targetBase = `http://${route.target}`;
    const targetUrl = `${targetBase}${path}${url.search}`;

    return targetUrl;
  }

  /**
   * Build headers for forwarded request
   */
  private buildHeaders(c: Context, route: MatchedRoute): HeadersInit {
    const headers: Record<string, string> = {};

    // Copy relevant headers from original request
    const headersToForward = [
      'content-type',
      'content-length',
      'accept',
      'accept-encoding',
      'accept-language',
      'cache-control',
      'user-agent',
    ];

    for (const header of headersToForward) {
      const value = c.req.header(header);
      if (value) {
        headers[header] = value;
      }
    }

    // Add custom headers
    // These headers are trusted by backend services
    // (they've already gone through gateway authentication)

    // User ID (if authenticated)
    const userId = c.get('userId'); // Will be set by auth middleware
    if (userId) {
      headers['x-user-id'] = userId;
    }

    // User roles (if authenticated)
    const roles = c.get('roles');
    if (roles && Array.isArray(roles)) {
      headers['x-user-roles'] = roles.join(',');
    }

    // Gym context (if available)
    const gymId = c.get('gymId');
    if (gymId) {
      headers['x-gym-context'] = gymId;
    }

    // Request ID for tracing
    const requestId = c.get('requestId') || this.generateRequestId();
    headers['x-request-id'] = requestId;

    // Original IP (if behind proxy)
    const clientIp = c.req.header('x-forwarded-for') || c.req.header('x-real-ip');
    if (clientIp) {
      headers['x-forwarded-for'] = clientIp;
    }

    // Original host and protocol detection
    headers['x-forwarded-host'] = c.req.header('host') || '';
    // Detect protocol from incoming headers or URL
    const proto = c.req.header('x-forwarded-proto')
      || (new URL(c.req.url).protocol.replace(':', ''));
    headers['x-forwarded-proto'] = proto;

    return headers;
  }

  /**
   * Get request body (if any)
   * Throws on read failure to prevent destructive requests with missing payloads
   */
  private async getRequestBody(c: Context): Promise<BodyInit | null> {
    const method = c.req.method;

    // GET, HEAD, OPTIONS don't have bodies
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return null;
    }

    // Get raw request body - fail fast on error
    const body = await c.req.raw.clone().arrayBuffer();
    return body.byteLength > 0 ? body : null;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}