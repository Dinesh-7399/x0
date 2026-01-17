// test-domain.ts
import { User, UserStatus } from './src/domain/entities/User.js';
import { Email } from './src/domain/value-objects/Email.js';
import { Password } from './src/domain/value-objects/Password.js';

async function testDomain() {
  console.log('🧪 Testing Domain Layer...\n');

  // Test Email value object
  try {
    const email = Email.create('john@example.com');
    console.log('✅ Email created:', email.getValue());
  } catch (error) {
    console.error('❌ Email failed:', error);
  }

  // Test invalid email
  try {
    Email.create('invalid-email');
    console.error('❌ Should have thrown error for invalid email');
  } catch (error) {
    console.log('✅ Invalid email rejected:', (error as Error).message);
  }

  // Test Password value object
  try {
    const password = await Password.create('SecurePass123!');
    console.log('✅ Password created and hashed');
    
    // Test comparison
    const isMatch = await password.compare('SecurePass123!');
    console.log('✅ Password comparison:', isMatch);
  } catch (error) {
    console.error('❌ Password failed:', error);
  }

  // Test weak password
  try {
    await Password.create('weak');
    console.error('❌ Should have thrown error for weak password');
  } catch (error) {
    console.log('✅ Weak password rejected:', (error as Error).message);
  }

  // Test User entity
  const passwordHash = 'hashed_password_here';
  const user = User.create({
    email: 'john@example.com',
    passwordHash,
    emailVerified: false,
    phoneVerified: false,
    status: UserStatus.ACTIVE,
  });

  console.log('\n✅ User created:', user.toDTO());

  // Test business rules
  const canLogin = user.canLogin();
  console.log('Can login?', canLogin);
  // Should be: { allowed: false, reason: 'Email not verified' }

  user.verifyEmail();
  const canLoginNow = user.canLogin();
  console.log('Can login after verification?', canLoginNow);
  // Should be: { allowed: true }

  console.log('\n✅ All domain tests passed!');
}

testDomain();