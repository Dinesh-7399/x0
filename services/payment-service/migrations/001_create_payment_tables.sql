CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_order_id VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL, -- in smallest currency unit (paise)
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  status VARCHAR(20) NOT NULL, -- CREATED, ATTEMPTED, PAID, FAILED
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES payment_orders(id),
  gateway_payment_id VARCHAR(255) UNIQUE NOT NULL,
  gateway_signature VARCHAR(512),
  status VARCHAR(20) NOT NULL, -- SUCCESS, FAILED
  method VARCHAR(50), -- UPI, CARD, etc
  amount INTEGER NOT NULL,
  fee INTEGER,
  tax INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_orders_user ON payment_orders(user_id);
CREATE INDEX idx_transactions_order ON transactions(order_id);
