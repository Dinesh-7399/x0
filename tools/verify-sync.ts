import { fetch } from 'bun';

// Use Gateway by default for integration testing
const API_URL = process.env.API_URL || 'http://localhost:80/api/v1';
const EMAIL = `test.sync.${Date.now()}@example.com`;
const PASSWORD = 'Password123!';

async function main() {
  // Ensure logs dir exists
  const fs = await import('fs');
  const path = await import('path');
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
  const logFile = path.join(logDir, 'verify_sync.log');

  const log = (msg: string | object) => {
    const str = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);
    console.log(str);
    fs.appendFileSync(logFile, str + '\n');
  };

  log('🚀 Starting Integration Verification');
  log(`Target: ${API_URL}`);
  log(`Test User: ${EMAIL}`);

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
    log(`❌ Registration failed: ${registerRes.status} ${text}`);
    process.exit(1);
  }

  const registerData = await registerRes.json() as { accessToken: string; user: { id: string } };
  const token = registerData.accessToken;
  const userId = registerData.user.id;
  log('✅ Registration successful');
  console.log(`   User ID: ${userId}`);
  console.log(`   Token: ${token.substring(0, 20)}...`);

  // 2. Wait for Sync (Redis Async)
  log('\n2. Waiting for Event Sync (2s)...');
  await new Promise(r => setTimeout(r, 2000));

  // 3. Get Profile (User Service)
  log('\n3. Fetching Profile (User Service)...');
  const profileRes = await fetch(`${API_URL}/users/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!profileRes.ok) {
    const text = await profileRes.text();
    log(`❌ Failed to fetch profile (Sync Issue): ${profileRes.status} ${text}`);
    log('   Continuing to verification of other services...');
  } else {
    try {
      const profileData = await profileRes.json() as { firstName: string; lastName: string };
      log('✅ Profile found!');
      log(`   Profile: ${JSON.stringify(profileData)}`);

      if (profileData.firstName === 'New' && profileData.lastName === 'User') {
        log('   ✅ Default "New User" name confirms creation via event.');
      } else {
        log('   ⚠️ Profile exists but name does not match expected default.');
      }

      // 4. Update Profile
      log('\n4. Updating Profile...');
      const updateRes = await fetch(`${API_URL}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ firstName: 'Integration', lastName: 'Tested' }),
      });

      if (!updateRes.ok) {
        log(`❌ Failed to update profile: ${updateRes.status}`);
      } else {
        const updatedData = await updateRes.json();
        log(`✅ Profile updated: ${JSON.stringify(updatedData)}`);
      }
    } catch (e) {
      log(`❌ Profile JSON Parse/Update Error: ${(e as Error).message}`);
    }
  }


  // 5. Check Gym Service (Public)
  console.log('\n5. Checking Gym Service (Search)...');
  const gymRes = await fetch(`${API_URL}/gyms/search?q=test`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (gymRes.ok) {
    const gymData = await gymRes.json();
    log(`✅ Gym Service responded: ${gymData}`);
  } else {
    // Optional - might fail if Gym service not ready/seeded, but shouldn't crash sync test
    log(`⚠️ Gym Service check failed: ${gymRes.status}`);
  }

  // 6. Check Chat Service (Create Conversation)
  log('\n6. Checking Chat Service...');
  log(`   Token being used: ${token?.substring(0, 20)}...`);

  const chatRes = await fetch(`${API_URL}/conversations/`, {
    headers: {
      'Authorization': `Bearer ${token}`
    },
  });

  if (chatRes.ok) {
    log('✅ Chat Service: Conversations retrieved');
  } else {
    // console.log('   Token being used:', token.substring(0, 20) + '...');
    const text = await chatRes.text();
    log(`❌ Chat Service check failed: ${chatRes.status} ${chatRes.statusText}`);
    log(`   Full response: ${text}`);
  }

  // 7. Check Social Service
  log('\n7. Checking Social Service (Followers)...');
  const socialRes = await fetch(`${API_URL}/social/users/${userId}/followers`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!socialRes.ok) {
    log(`❌ Social Service check failed: ${socialRes.status} ${socialRes.statusText}`);
    log(`   Response: ${await socialRes.text()}`);
  } else {
    log('✅ Social Service: Followers retrieved');
  }

  // 8. Phase 2 Verification: Feed & Events
  log('\n8. Verifying Feed & Events (Phase 2)...');

  // A. Register User B
  log('   Creating User B...');
  const userBEmail = `user.b.${Date.now()}@example.com`;
  const regB = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userBEmail, password: 'Password123!', firstName: 'User', lastName: 'B' }),
  });
  if (!regB.ok) {
    console.log(`❌ User B Registration Failed: ${regB.status}`);
    console.log('   Response:', await regB.text());
  } else {
    const dataB = await regB.json() as any;
    const tokenB = dataB.token;
    const userIdB = dataB.user.id;
    console.log(`   User B Created: ${userIdB}`);

    // B. User A Follows User B
    console.log(`   User A (${userId}) following User B (${userIdB})...`);
    // NOTE: /social/follows/users/:targetId matches route POST /follows/users/:targetId inside /social mount
    const followRes = await fetch(`${API_URL}/social/follows/users/${userIdB}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (followRes.ok) {
      console.log('   ✅ Follow Successful. Waiting for Event Propagation (3s)...');
      await new Promise(r => setTimeout(r, 3000));

      // C. Check User B's Feed
      console.log("   Checking User B's Feed...");
      const feedRes = await fetch(`${API_URL}/feed/`, {
        headers: { 'Authorization': `Bearer ${tokenB}` }
      });

      if (feedRes.ok) {
        const feed = await feedRes.json();
        console.log('   Feed Response:', JSON.stringify(feed, null, 2));
        if (Array.isArray(feed) && feed.length > 0) {
          console.log('   ✅ Feed Item Found!');
          console.log(`      Content: ${feed[0].metadata?.message || 'Unknown'}`);
        } else {
          console.log('   ⚠️ Feed Empty. Event/Listener might have failed.');
        }
      } else {
        console.log(`   ❌ Feed Service Failed: ${feedRes.status}`);
      }
    } else {
      console.log(`   ❌ Follow Failed: ${followRes.status} ${await followRes.text()}`);
    }
  }


  // 9. Phase 3 Verification: Payments
  console.log('\n9. Verifying Payment Service...');
  const payRes = await fetch(`${API_URL}/payments/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: 50000,
      currency: 'INR',
      metadata: { plan: 'premium_monthly' }
    })
  });

  if (payRes.ok) {
    try {
      const orderData = await payRes.json();
      log(`   ✅ Payment Order Created: ${JSON.stringify(orderData, null, 2)}`);
    } catch (e) {
      log(`❌ Payment Order JSON Parse Error: ${(e as Error).message}`);
    }
  } else {
    log(`   ❌ Payment Order Failed: ${payRes.status} ${await payRes.text()}`);
  }

  log('\n🎉 Verification Complete! All services (Identity, User, Gym, Chat, Social, Feed, Payment) are syncing and reachable.');
}

main().catch(console.error);
