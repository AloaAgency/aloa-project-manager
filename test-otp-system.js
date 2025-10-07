/**
 * OTP Authentication System Test Script
 *
 * This script helps test the OTP authentication endpoints
 * Run with: node test-otp-system.js
 */

const BASE_URL = 'http://localhost:3000';

// Test email - replace with a real email you have access to
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'newpassword123';

async function testSendOTP(email, type = 'recovery') {
  console.log(`\n🔐 Testing Send OTP (${type})...`);
  console.log(`Email: ${email}`);

  try {
    const response = await fetch(`${BASE_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, type })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS:', data);
      console.log(`📧 Check email ${email} for the 6-digit code`);
      return data;
    } else {
      console.log('❌ ERROR:', data);
      return null;
    }
  } catch (error) {
    console.log('❌ FETCH ERROR:', error.message);
    return null;
  }
}

async function testVerifyOTPReset(email, token, newPassword) {
  console.log('\n🔑 Testing Verify OTP and Reset Password...');
  console.log(`Email: ${email}`);
  console.log(`Token: ${token}`);

  try {
    const response = await fetch(`${BASE_URL}/api/auth/verify-otp-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        token,
        newPassword,
        type: 'recovery'
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS:', data);
      return data;
    } else {
      console.log('❌ ERROR:', data);
      return null;
    }
  } catch (error) {
    console.log('❌ FETCH ERROR:', error.message);
    return null;
  }
}

async function testVerifyOTPLogin(email, token) {
  console.log('\n🔐 Testing Verify OTP and Login...');
  console.log(`Email: ${email}`);
  console.log(`Token: ${token}`);

  try {
    const response = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        token,
        type: 'magiclink'
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS:', data);
      return data;
    } else {
      console.log('❌ ERROR:', data);
      return null;
    }
  } catch (error) {
    console.log('❌ FETCH ERROR:', error.message);
    return null;
  }
}

// Interactive test menu
async function runTests() {
  console.log('🧪 OTP Authentication System Test\n');
  console.log('Available Tests:');
  console.log('1. Test Password Reset Flow (send OTP)');
  console.log('2. Test Verify OTP and Reset Password (requires OTP code)');
  console.log('3. Test Login Flow (send OTP)');
  console.log('4. Test Verify OTP and Login (requires OTP code)');
  console.log('\n');

  // Get command line arguments
  const args = process.argv.slice(2);
  const testType = args[0];

  if (!testType) {
    console.log('Usage:');
    console.log('  node test-otp-system.js send-reset <email>');
    console.log('  node test-otp-system.js verify-reset <email> <otp-code> <new-password>');
    console.log('  node test-otp-system.js send-login <email>');
    console.log('  node test-otp-system.js verify-login <email> <otp-code>');
    console.log('\nExample:');
    console.log('  node test-otp-system.js send-reset user@example.com');
    console.log('  node test-otp-system.js verify-reset user@example.com 123456 newpass123');
    return;
  }

  switch (testType) {
    case 'send-reset':
      const resetEmail = args[1] || TEST_EMAIL;
      await testSendOTP(resetEmail, 'recovery');
      break;

    case 'verify-reset':
      const verifyResetEmail = args[1] || TEST_EMAIL;
      const resetOTP = args[2];
      const newPassword = args[3] || TEST_PASSWORD;

      if (!resetOTP) {
        console.log('❌ Error: OTP code is required');
        console.log('Usage: node test-otp-system.js verify-reset <email> <otp-code> <new-password>');
        return;
      }

      await testVerifyOTPReset(verifyResetEmail, resetOTP, newPassword);
      break;

    case 'send-login':
      const loginEmail = args[1] || TEST_EMAIL;
      await testSendOTP(loginEmail, 'magiclink');
      break;

    case 'verify-login':
      const verifyLoginEmail = args[1] || TEST_EMAIL;
      const loginOTP = args[2];

      if (!loginOTP) {
        console.log('❌ Error: OTP code is required');
        console.log('Usage: node test-otp-system.js verify-login <email> <otp-code>');
        return;
      }

      await testVerifyOTPLogin(verifyLoginEmail, loginOTP);
      break;

    default:
      console.log(`❌ Unknown test type: ${testType}`);
      console.log('Valid types: send-reset, verify-reset, send-login, verify-login');
  }
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
