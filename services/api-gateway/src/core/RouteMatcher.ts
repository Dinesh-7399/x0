// src/core/RouteMatcher.ts
import type { RouteConfig, MatchedRoute, HttpMethod } from '../types/route.types.js';

/**
 * Route Matcher
 * Matches incoming requests to configured routes
 */
export class RouteMatcher {
  private compiledRoutes: Map<string, { pattern: RegExp; route: RouteConfig }[]> = new Map();

  constructor(private routes: RouteConfig[]) {
    this.compileRoutes();
  }

  /**
   * Compile route patterns to regex for efficient matching
   */
  private compileRoutes(): void {
    for (const route of this.routes) {
      const methods = Array.isArray(route.method) ? route.method : [route.method];
      
      for (const method of methods) {
        if (!this.compiledRoutes.has(method)) {
          this.compiledRoutes.set(method, []);
        }
        
        // Convert route path to regex pattern
        // /api/v1/users/* -> ^/api/v1/users/.*$
        // /api/v1/users/:id -> ^/api/v1/users/([^/]+)$
        const pattern = this.pathToRegex(route.path);
        
        this.compiledRoutes.get(method)!.push({ pattern, route });
      }
    }
  }

  /**
   * Convert path pattern to regex
   * Supports:
   * - Exact match: /api/v1/auth/login
   * - Wildcard: /api/v1/users/*
   * - Parameters: /api/v1/users/:id (future)
   */
  private pathToRegex(path: string): RegExp {
    // Escape special regex characters except * and :
    let regexPattern = path.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    
    // Replace * with .*
    regexPattern = regexPattern.replace(/\*/g, '.*');
    
    // Replace :param with named capture group (future feature)
    regexPattern = regexPattern.replace(/:(\w+)/g, '(?<$1>[^/]+)');
    
    // Anchor to start and end
    regexPattern = `^${regexPattern}$`;
    
    return new RegExp(regexPattern);
  }

  /**
   * Match a request to a route
   * @param method HTTP method
   * @param path Request path
   * @returns Matched route or null
   */
  match(method: HttpMethod, path: string): MatchedRoute | null {
    const methodRoutes = this.compiledRoutes.get(method);
    
    if (!methodRoutes) {
      return null;
    }
    
    // Try to match path against all routes for this method
    for (const { pattern, route } of methodRoutes) {
      const match = path.match(pattern);
      
      if (match) {
        // Extract named parameters (if any)
        const params = match.groups || {};
        
        return {
          ...route,
          params,
          pathPattern: pattern,
        };
      }
    }
    
    return null;
  }

  /**
   * Get all routes (for debugging)
   */
  getAllRoutes(): RouteConfig[] {
    return this.routes;
  }
}