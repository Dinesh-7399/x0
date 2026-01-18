import { fetch } from 'bun';
import postgres from 'postgres';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Log setup
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
const logFile = path.join(logDir, 'verify_membership.log');

const log = (msg: string | object) => {
  const str = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);
  console.log(str);
  fs.appendFileSync(logFile, str + '\n');
};

const AUTH_URL = 'http://127.0.0.1:8081/auth';
const MEMBERSHIP_URL = 'http://127.0.0.1:8089';
const WEBHOOK_URL = 'http://127.0.0.1:8088/webhooks/razorpay';
const USER_EMAIL = `mem_test_${Date.now()}@example.com`;
const PASSWORD = 'Password123!';

async function main() {
  log('🚀 Starting Membership Verification (Direct Ports IP)...');

  // 1. Register User (Identity Service :8081)
  console.log('1️⃣ Registering User...');
  let res = await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: USER_EMAIL,
      password: PASSWORD,
      firstName: 'Membership',
      lastName: 'Tester'
    })
  });

  let text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    if (res.status === 409) {
      console.log('User exists.');
    } else {
      throw new Error(`Registration Failed (Non-JSON): ${res.status} ${text}`);
    }
  }

  if (res.ok) {
    log('User Registered.');
    log(`Token: ${data.accessToken?.substring(0, 20)}...`);
  } else if (res.status !== 409) {
    throw new Error(`Registration Failed: ${res.status} ${text}`);
  }

  // FORCE VERIFY EMAIL
  const sqlAuth = postgres('postgresql://gymato:gymato_dev@localhost:5432/gymato');
  await sqlAuth`UPDATE users SET email_verified = true WHERE email = ${USER_EMAIL}`;
  log('✅ User Forcibly Verified (DB)');
  await sqlAuth.end();

  // Login
  res = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: USER_EMAIL, password: PASSWORD })
  });
  text = await res.text();
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Login Failed (Parse): ${res.status} ${text}`);
  }
  if (!res.ok || !data.accessToken) {
    throw new Error(`Login Failed: ${res.status} ${JSON.stringify(data)}`);
  }
  const token = data.accessToken;
  log('✅ User Logged In');
  log(`Token Raw: ${JSON.stringify(token)}`);
  try {
    const parts = token.split('.');
    log(`Token Parts: ${parts.length}`);
    if (parts.length !== 3) throw new Error('Invalid JWT Parts');
  } catch (e) {
    console.error('BAD TOKEN from Identity:', e);
    throw e;
  }

  // 2. Seed Plan
  const sql = postgres('postgresql://gymato:gymato_dev@localhost:5432/gymato');

  // MIGRATION: Create Tables if not exist
  await sql`
    CREATE TABLE IF NOT EXISTS plans (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price NUMERIC(10, 2) NOT NULL,
      currency VARCHAR(3) NOT NULL,
      duration_days INTEGER NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      plan_id VARCHAR(255) NOT NULL REFERENCES plans(id),
      status VARCHAR(50) NOT NULL, -- PENDING, ACTIVE, CANCELLED, EXPIRED
      start_date TIMESTAMP WITH TIME ZONE,
      end_date TIMESTAMP WITH TIME ZONE,
      payment_order_id VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  log('✅ Tables Migrated (Plans/Subscriptions)');

  const planId = `plan_${Date.now()}`;
  await sql`INSERT INTO plans (id, name, description, price, currency, duration_days, is_active, created_at, updated_at)
    VALUES (${planId}, 'Pro Plan', 'Test Plan', 29900, 'INR', 30, true, NOW(), NOW())`;
  log(`✅ Seeded Plan: ${planId}`);

  // 3. Subscribe (Membership Service :8089)
  log('3️⃣ Subscribing to Plan...');
  res = await fetch(`${MEMBERSHIP_URL}/memberships/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ planId })
  });
  text = await res.text();
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Subscribe Failed: ${res.status} ${text}`);
  }
  if (!res.ok) throw new Error(`Subscribe Failed: ${JSON.stringify(data)}`);

  const { subscriptionId, gatewayOrderId, paymentOrderId } = data;
  log(`✅ Subscription Created. SubID: ${subscriptionId}, PayOrder: ${gatewayOrderId}`);

  // 4. Verify Pending
  res = await fetch(`${MEMBERSHIP_URL}/memberships/my-subscription`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  data = await res.json() as { status: string };
  if (data.status === 'ACTIVE') throw new Error('Subscription should NOT be active yet');
  log('✅ Subscription is NOT Active yet (Correct)');

  // 5. Webhook (Payment Service :8088)
  log('5️⃣ Simulating Payment Webhook...');

  const secret = 'webhook_secret_placeholder'; // Match docker-compose env

  const payload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_mock_123',
          order_id: gatewayOrderId, // gatewayOrderId from Subscribe response
          status: 'captured',
          method: 'upi',
          amount: 29900, // Matches plan price
          currency: 'INR'
        }
      }
    }
  });

  // const hmac = crypto.createHmac('sha256', secret);
  // hmac.update(payload);
  // const signature = hmac.digest('hex');
  const signature = 'mock_webhook_signature';

  res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': signature
    },
    body: payload
  });

  if (!res.ok) log(`Webhook response: ${await res.text()}`);
  log('✅ Webhook Sent');

  // 6. Wait
  log('6️⃣ Waiting for Event Processing (5s)...');
  await new Promise(r => setTimeout(r, 5000));

  // 7. Verify Active
  res = await fetch(`${MEMBERSHIP_URL}/memberships/my-subscription`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  data = await res.json() as { status: string };

  if (data.status !== 'ACTIVE') {
    throw new Error(`Subscription verification failed. Status: ${JSON.stringify(data)} (Expected ACTIVE)`);
  }
  log(`✅ Subscription Activated! ${JSON.stringify(data)}`);

  await sql.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
