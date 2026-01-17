import { fetch } from 'bun';

// Use local ports when running services directly (not via Docker)
const API_URL = process.env.USE_GATEWAY === '1'
  ? 'http://localhost:80/api/v1'
  : 'http://localhost:8081';  // Direct to identity-service
const EMAIL = `test.sync.${Date.now()}@example.com`;
const PASSWORD = 'Password123!';

async function main() {
  console.log('🚀 Starting Integration Verification');
  console.log(`Target: ${API_URL}`);
  console.log(`Test User: ${EMAIL}`);

  // 1. Register (Identity Service)
  console.log('\nPlease ensure services are running...');
  console.log('\n1. Registering User...');
  const registerRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  if (!registerRes.ok) {
    const text = await registerRes.text();
    console.error('❌ Registration failed:', registerRes.status, text);
    process.exit(1);
  }

  const registerData = await registerRes.json() as { accessToken: string; user: { id: string } };
  const token = registerData.accessToken;
  const userId = registerData.user.id;
  console.log('✅ Registration successful');
  console.log(`   User ID: ${userId}`);
  console.log(`   Token: ${token.substring(0, 20)}...`);

  // 2. Wait for Sync (Redis Async)
  console.log('\n2. Waiting for Event Sync (2s)...');
  await new Promise(r => setTimeout(r, 2000));

  // 3. Get Profile (User Service)
  console.log('\n3. Fetching Profile (User Service)...');
  const profileRes = await fetch(`${API_URL}/users/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!profileRes.ok) {
    const text = await profileRes.text();
    console.error('❌ Failed to fetch profile:', profileRes.status, text);
    console.error('   This implies the profile was NOT created by the sync event.');
    process.exit(1);
  }

  const profileData = await profileRes.json() as { firstName: string; lastName: string };
  console.log('✅ Profile found!');
  console.log('   Profile:', profileData);

  if (profileData.firstName === 'New' && profileData.lastName === 'User') {
    console.log('   ✅ Default "New User" name confirms creation via event.');
  } else {
    console.warn('   ⚠️ Profile exists but name does not match expected default.');
  }

  // 4. Update Profile
  console.log('\n4. Updating Profile...');
  const updateRes = await fetch(`${API_URL}/users/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ firstName: 'Integration', lastName: 'Tested' }),
  });

  if (!updateRes.ok) {
    console.error('❌ Failed to update profile:', updateRes.status);
    process.exit(1);
  }

  const updatedData = await updateRes.json();
  console.log('✅ Profile updated:', updatedData);

  console.log('\n🎉 Verification Complete! Services are syncing correctly.');
}

main().catch(console.error);
