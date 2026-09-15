const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

function extractToken(body) {
  if (body?.data?.accessToken) return body.data.accessToken;
  if (body?.accessToken) return body.accessToken;
  if (body?.data?.tokens?.accessToken) return body.data.tokens.accessToken;
  return null;
}

function extractData(body) {
  return body?.data !== undefined ? body.data : body;
}

async function runTests() {
  console.log('=== Comprehensive Testing of FCM Push Notification Toggle Routes ===\n');

  // 1. Super Admin
  console.log('1. [Super Admin] Logging in (01700000000)...');
  const superAdminLoginRes = await request(
    {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/v1/auth/signin',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { phoneNumber: '01700000000', password: 'password123' }
  );
  const superAdminToken = extractToken(superAdminLoginRes.body);
  console.log('   Super Admin logged in. Token acquired.');

  console.log('   Checking push status via GET /api/v1/notifications/push-status...');
  let res = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/notifications/push-status',
    method: 'GET',
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  console.log('   Status:', extractData(res.body));

  console.log('   Toggling OFF via PATCH /api/v1/notifications/push-toggle...');
  res = await request(
    {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/v1/notifications/push-toggle',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
    },
    { enabled: false }
  );
  console.log('   Toggle OFF:', extractData(res.body));
  if (extractData(res.body).isPushNotificationEnabled !== false) throw new Error('Expected false');

  console.log('   Toggling ON via POST /api/v1/notifications/push-toggle with fcmToken...');
  res = await request(
    {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/v1/notifications/push-toggle',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
    },
    { enabled: true, fcmToken: 'super_admin_fcm_token_valid' }
  );
  console.log('   Toggle ON:', extractData(res.body));
  if (extractData(res.body).isPushNotificationEnabled !== true) throw new Error('Expected true');

  // 2. Admin
  console.log('\n2. [Admin] Logging in (01600000000)...');
  const adminLoginRes = await request(
    {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/v1/auth/signin',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { phoneNumber: '01600000000', password: '123456' }
  );
  const adminToken = extractToken(adminLoginRes.body);
  console.log('   Admin logged in. Token acquired.');

  console.log('   Testing Admin toggle OFF via PATCH /api/v1/auth/push-toggle...');
  res = await request(
    {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/v1/auth/push-toggle',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    },
    { enabled: false }
  );
  console.log('   Admin Toggle OFF:', extractData(res.body));
  if (extractData(res.body).isPushNotificationEnabled !== false) throw new Error('Expected false');

  res = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/auth/push-status',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('   Admin Status check:', extractData(res.body));
  if (extractData(res.body).isPushNotificationEnabled !== false) throw new Error('Expected false');

  // Restore Admin
  await request(
    {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/v1/auth/push-toggle',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    },
    { enabled: true }
  );

  // 3. Company
  console.log('\n3. [Company] Logging in (01500000000)...');
  const compLoginRes = await request(
    {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/v1/auth/company/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { phoneNumber: '01500000000', password: '123456' }
  );
  const compToken = extractToken(compLoginRes.body);
  console.log('   Company logged in. Token acquired.');

  console.log('   Testing Company toggle OFF via PATCH /api/v1/notifications/push-toggle...');
  res = await request(
    {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/v1/notifications/push-toggle',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${compToken}`,
      },
    },
    { enabled: false }
  );
  console.log('   Company Toggle OFF:', extractData(res.body));
  if (extractData(res.body).isPushNotificationEnabled !== false) throw new Error('Expected false');

  res = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/notifications/push-status',
    method: 'GET',
    headers: { Authorization: `Bearer ${compToken}` },
  });
  console.log('   Company Status check:', extractData(res.body));
  if (extractData(res.body).isPushNotificationEnabled !== false) throw new Error('Expected false');

  // Restore Company
  await request(
    {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/v1/notifications/push-toggle',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${compToken}`,
      },
    },
    { enabled: true, fcmToken: 'company_fcm_token_restored' }
  );

  // 4. Party
  console.log('\n4. [Party] Logging in (01400000000)...');
  const partyLoginRes = await request(
    {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/v1/auth/party/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { phoneNumber: '01400000000', password: '123456' }
  );
  const partyToken = extractToken(partyLoginRes.body);
  console.log('   Party logged in. Token acquired.');

  console.log('   Testing Party toggle OFF via PATCH /api/v1/notifications/push-toggle...');
  res = await request(
    {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/v1/notifications/push-toggle',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${partyToken}`,
      },
    },
    { enabled: false }
  );
  console.log('   Party Toggle OFF:', extractData(res.body));
  if (extractData(res.body).isPushNotificationEnabled !== false) throw new Error('Expected false');

  res = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/notifications/push-status',
    method: 'GET',
    headers: { Authorization: `Bearer ${partyToken}` },
  });
  console.log('   Party Status check:', extractData(res.body));
  if (extractData(res.body).isPushNotificationEnabled !== false) throw new Error('Expected false');

  // Restore Party
  await request(
    {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/v1/notifications/push-toggle',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${partyToken}`,
      },
    },
    { enabled: true }
  );

  console.log('\n=============================================================');
  console.log('🎉 ALL ACTORS (SUPER ADMIN, ADMIN, COMPANY, PARTY) VERIFIED!');
  console.log('=============================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
