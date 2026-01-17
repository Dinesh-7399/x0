// test-jwt.ts
import { signToken } from './src/utils/jwt.utils.js';

/**
 * Generate test JWT tokens for testing the API Gateway
 */

// Valid token (expires in 15 minutes)
const validToken = signToken({
  sub: 'user-123',
  email: 'john@example.com',
  roles: ['member'],
}, '15m');

console.log('✅ Valid Token (expires in 15 min):');
console.log(validToken);
console.log('');

// Expired token (already expired)
const expiredToken = signToken({
  sub: 'user-456',
  email: 'jane@example.com',
  roles: ['member', 'trainer'],
}, '-1m'); // Negative expiry = already expired

console.log('❌ Expired Token:');
console.log(expiredToken);
console.log('');

// Token with gym context
const tokenWithGym = signToken({
  sub: 'user-789',
  email: 'coach@example.com',
  roles: ['trainer', 'owner'],
  gymId: 'gym-abc',
}, '1h');

console.log('🏋️ Token with Gym Context:');
console.log(tokenWithGym);
console.log('');

console.log('📝 Test with curl:');
console.log('');
console.log('# Test protected route (should succeed):');
console.log(`curl -H "Authorization: Bearer ${validToken}" http://localhost:80/api/v1/users/me`);
console.log('');
console.log('# Test without token (should fail):');
console.log('curl http://localhost:80/api/v1/users/me');
console.log('');
console.log('# Test with expired token (should fail):');
console.log(`curl -H "Authorization: Bearer ${expiredToken}" http://localhost:80/api/v1/users/me`);