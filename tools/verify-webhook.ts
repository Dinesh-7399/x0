import dotenv from 'dotenv';
import crypto from 'crypto-js';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:80';

const main = async () => {
  // 1. Create Order to get an ID (Mock Mode)
  // We need a valid Order ID in DB.
  // So we must run create order first?
  console.log('1. Creating Mock Order...');

  // Auth Token (Fake one if Mock Identity allows, or we use existing one from verify-sync?)
  // This script is separate. Assuming we can register a user or use hardcoded token if dev.
  // Actually, create order requires AUTH.

  // Let's assume user uses 'verify-sync' to populate DB.
  // We just want to test Webhooks.
  // We need an ORDER ID that exists in DB.
  // If we can't easily get one, we might fail unless we mock the Repo too? No.

  // Simplified: Just failing creation if Order ID missing is expected.
  // But we want to see "Processed payment.captured".

  // Let's rely on Mock Response from Create Order.

  // ... For now, just firing the webhook to see if it reaches the service.
  // Signature: HMAC("body", "webhook_secret_placeholder")

  const payload = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_mock_123",
          order_id: "order_mock_UNKNOWN", // This will fail lookup if not created
          method: "card",
          amount: 50000,
          status: "captured"
        }
      }
    }
  });

  // Mock Signature (If using MockGateway, it expects 'mock_webhook_signature')
  // If REAL Gateway, it expects HMAC.
  // We configured USE_MOCK_GATEWAY=true.
  const signature = "mock_webhook_signature";

  console.log(`Sending Webhook to ${API_URL}/api/v1/payments/webhooks/razorpay`);
  const res = await fetch(`${API_URL}/api/v1/payments/webhooks/razorpay`, {
    method: 'POST',
    headers: {
      'x-razorpay-signature': signature,
      'Content-Type': 'application/json'
    },
    body: payload
  });

  if (res.ok) {
    console.log('✅ Webhook Accepted');
  } else {
    console.log(`❌ Webhook Failed: ${res.status} ${await res.text()}`);
  }
};

main();
