#!/usr/bin/env node

/**
 * Quick Setup - Create Test Users (No Admin SDK Required)
 * Uses Firebase REST API to create users directly
 * 
 * Usage:
 *   node scripts/quick-setup.mjs
 */

import https from 'https';

const PROJECT_ID = 'emp-tool-56b9c';
const API_KEY = 'AIzaSyDzhi3lKjOkckhS5GUZrmOJCFYvPaI-5Ic';
const REST_ENDPOINT = 'https://identitytoolkit.googleapis.com/v1/accounts:signUp';

const testUsers = [
  {
    email: 'admin@test.com',
    password: 'test@123456',
    displayName: 'Test Admin',
  },
  {
    email: 'counsellor@test.com',
    password: 'test@123456',
    displayName: 'Test Counsellor',
  },
];

function makeRequest(url, method, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(body),
          });
        } catch {
          resolve({
            status: res.statusCode,
            body: body,
          });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function createTestUsers() {
  console.log('\n🚀 Employee Management - Quick Setup');
  console.log('═'.repeat(60));
  console.log('Creating test users using Firebase REST API...\n');

  for (const user of testUsers) {
    try {
      const url = `${REST_ENDPOINT}?key=${API_KEY}`;
      const response = await makeRequest(url, 'POST', {
        email: user.email,
        password: user.password,
        displayName: user.displayName,
        returnSecureToken: true,
      });

      if (response.status === 200 && response.body.localId) {
        console.log(`✅ Created: ${user.email}`);
        console.log(`   UID: ${response.body.localId}`);
      } else {
        // Might already exist, which is fine
        if (response.body?.error?.message?.includes('EMAIL_EXISTS')) {
          console.log(`ℹ️  Already exists: ${user.email}`);
        } else {
          console.log(`⚠️  ${user.email}: ${response.body?.error?.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error with ${user.email}:`, error.message);
    }
  }

  console.log('\n═'.repeat(60));
  console.log('✅ Setup Complete!\n');
  console.log('📋 Test Credentials:');
  console.log('────────────────────────────────────────────────────────────');
  console.log('Admin:\n  Email: admin@test.com\n  Password: test@123456\n');
  console.log('Counsellor:\n  Email: counsellor@test.com\n  Password: test@123456');
  console.log('────────────────────────────────────────────────────────────\n');
  console.log('🌐 Visit: http://localhost:3001/login\n');
}

createTestUsers().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
