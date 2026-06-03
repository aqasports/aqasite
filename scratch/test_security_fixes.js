const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

// Helper to make request
function request(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(responseBody); } catch(e) {}
        resolve({ status: res.statusCode, headers: res.headers, body: json || responseBody });
      });
    });

    req.on('error', (err) => { reject(err); });

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

// Backup admin-config.json
const configPath = path.join(__dirname, '../admin-config.json');
let originalConfigContent = '';
if (fs.existsSync(configPath)) {
  originalConfigContent = fs.readFileSync(configPath, 'utf8');
}

async function runTests() {
  console.log("=== Launching Security Integration Tests ===");

  try {
    // Reset config to legacy SHA-256 for migration test
    // Hash of 'AqaSports2026!' is '65cdacaf34486fbb5c32641665f6f5a1a6985aa89dbe66286f85bbdd4be34fd5'
    const legacyConfig = {
      passwordHash: '65cdacaf34486fbb5c32641665f6f5a1a6985aa89dbe66286f85bbdd4be34fd5',
      loginSlug: 'digger'
    };
    fs.writeFileSync(configPath, JSON.stringify(legacyConfig, null, 2), 'utf8');
    console.log("✓ Initialized admin-config.json with legacy SHA-256 hash.");

    // TEST 1: Unauthenticated Data Access Blocked
    console.log("\n[Test 1] Fetching admin data without JWT...");
    const res1 = await request('GET', '/api/admin-data');
    console.log(`Status: ${res1.status}`);
    if (res1.status === 401) {
      console.log("PASS: Access blocked without Authorization header.");
    } else {
      throw new Error(`FAIL: Got status ${res1.status}, expected 401.`);
    }

    // TEST 2: Login with Correct Password & Token Generation & Bcrypt Migration
    console.log("\n[Test 2] Logging in with correct password...");
    const res2 = await request('POST', '/api/admin-auth', {}, { password: 'AqaSports2026!' });
    console.log(`Status: ${res2.status}`, res2.body);
    if (res2.status === 200 && res2.body.success && res2.body.token) {
      console.log("PASS: JWT token generated successfully.");
      var jwtToken = res2.body.token;
    } else {
      throw new Error("FAIL: Authentication failed.");
    }

    // Check if hash migrated to bcrypt in file
    const cfgAfterLogin = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log("New config passwordHash:", cfgAfterLogin.passwordHash);
    if (cfgAfterLogin.passwordHash.startsWith('$2a$') || cfgAfterLogin.passwordHash.startsWith('$2b$')) {
      console.log("PASS: Configuration transparently migrated to bcrypt hashing.");
    } else {
      throw new Error("FAIL: Configuration password hash did not migrate to bcrypt.");
    }

    // TEST 3: Login with Wrong Password
    console.log("\n[Test 3] Logging in with wrong password...");
    const res3 = await request('POST', '/api/admin-auth', {}, { password: 'wrongpassword' });
    console.log(`Status: ${res3.status}`, res3.body);
    if (res3.status === 401) {
      console.log("PASS: Incorrect password rejected.");
    } else {
      throw new Error("FAIL: Wrong password accepted.");
    }

    // TEST 4: Fetch Admin Data with JWT
    console.log("\n[Test 4] Fetching admin data with valid JWT...");
    const res4 = await request('GET', '/api/admin-data', { 'Authorization': `Bearer ${jwtToken}` });
    console.log(`Status: ${res4.status}`);
    if (res4.status === 200 && res4.body.success && res4.body.schedule) {
      console.log("PASS: Administrative data retrieved successfully.");
    } else {
      throw new Error(`FAIL: Retrieval failed. Status: ${res4.status}`);
    }

    // TEST 5: Verify Token Validity
    console.log("\n[Test 5] Verifying valid JWT token...");
    const res5 = await request('GET', '/api/verify-token', { 'Authorization': `Bearer ${jwtToken}` });
    console.log(`Status: ${res5.status}`, res5.body);
    if (res5.status === 200 && res5.body.success && res5.body.valid) {
      console.log("PASS: Token validated successfully.");
    } else {
      throw new Error("FAIL: Token verification endpoint failed.");
    }

    // TEST 6: Save Admin Config Gated by Password
    console.log("\n[Test 6] Saving config with wrong current password...");
    const res6 = await request('POST', '/api/save-admin-config', { 'Authorization': `Bearer ${jwtToken}` }, {
      currentPassword: 'wrongpassword',
      loginSlug: 'digger-new'
    });
    console.log(`Status: ${res6.status}`, res6.body);
    if (res6.status === 401) {
      console.log("PASS: Request rejected due to wrong current password verification.");
    } else {
      throw new Error("FAIL: Setting changed without current password verification.");
    }

    console.log("\n[Test 6b] Saving config with correct current password...");
    const res6b = await request('POST', '/api/save-admin-config', { 'Authorization': `Bearer ${jwtToken}` }, {
      currentPassword: 'AqaSports2026!',
      loginSlug: 'digger'
    });
    console.log(`Status: ${res6b.status}`, res6b.body);
    if (res6b.status === 200 && res6b.body.success) {
      console.log("PASS: Config updated successfully with correct current password.");
    } else {
      throw new Error("FAIL: Config update rejected.");
    }

    // TEST 7: Deploy endpoint checks password
    console.log("\n[Test 7] Running deploy with wrong password...");
    const res7 = await request('POST', '/api/deploy', { 'Authorization': `Bearer ${jwtToken}` }, { password: 'wrong' });
    console.log(`Status: ${res7.status}`, res7.body);
    if (res7.status === 401) {
      console.log("PASS: Deploy blocked for invalid password.");
    } else {
      throw new Error("FAIL: Deploy accepted invalid password.");
    }

    console.log("\n=================================");
    console.log("🎉 ALL SECURITY INTEGRATION TESTS PASSED!");
    console.log("=================================");

  } catch(e) {
    console.error("\n❌ TESTS FAILED!");
    console.error(e);
  } finally {
    // Restore original config
    if (originalConfigContent) {
      fs.writeFileSync(configPath, originalConfigContent, 'utf8');
      console.log("✓ Restored original admin-config.json content.");
    }
  }
}

runTests();
