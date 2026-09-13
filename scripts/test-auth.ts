import { adminPassword, sessionToken, cookieIsValid, getSessionExpiry } from '../src/lib/adminAuth';

async function runTests() {
  console.log('--- Testing adminAuth ---');
  const token = await sessionToken();
  console.log('Generated token:', token);
  
  const isValid = await cookieIsValid(token);
  console.log('Token is valid:', isValid);
  if (!isValid) throw new Error('Token should be valid');

  const expiry = getSessionExpiry(token);
  console.log('Expiry timestamp:', expiry, 'Difference (sec):', expiry ? Math.round((expiry - Date.now()) / 1000) : 0);
  if (!expiry || expiry <= Date.now()) throw new Error('Expiry should be in future');

  const tamperedToken = token.slice(0, -4) + 'abcd';
  const isTamperedValid = await cookieIsValid(tamperedToken);
  console.log('Tampered token is valid (should be false):', isTamperedValid);
  if (isTamperedValid) throw new Error('Tampered token should be rejected');

  const expiredToken = `${Date.now() - 10000}.dummySig`;
  const isExpiredValid = await cookieIsValid(expiredToken);
  console.log('Expired token is valid (should be false):', isExpiredValid);
  if (isExpiredValid) throw new Error('Expired token should be rejected');

  console.log('✅ adminAuth tests PASSED!\n');
}

runTests().catch((e) => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
