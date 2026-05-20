#!/usr/bin/env node

/**
 * Create Employee Documents in Firestore
 * Adds the two test users to the employees collection
 * 
 * Usage:
 *   node scripts/create-firestore-docs.mjs <admin-uid> <counsellor-uid>
 * 
 * Or run without UIDs to use manual input
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(dirname(__dirname));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

console.log('\n🚀 Firestore Employee Documents Setup');
console.log('═'.repeat(60));

// Try to load Firebase credentials
let serviceAccount;
try {
  const envPath = join(projectRoot, 'Empolyee_Management', '.env.local');
  const envContent = readFileSync(envPath, 'utf8');
  
  const adminProjectIdMatch = envContent.match(/FIREBASE_ADMIN_PROJECT_ID="([^"]+)"/);
  const adminClientEmailMatch = envContent.match(/FIREBASE_ADMIN_CLIENT_EMAIL="([^"]+)"/);
  const adminPrivateKeyMatch = envContent.match(/FIREBASE_ADMIN_PRIVATE_KEY="([^"]+)"/);
  
  if (adminProjectIdMatch && adminClientEmailMatch && adminPrivateKeyMatch) {
    const privateKey = adminPrivateKeyMatch[1].replace(/\\n/g, '\n');
    serviceAccount = {
      type: 'service_account',
      project_id: adminProjectIdMatch[1],
      private_key_id: 'key123',
      private_key: privateKey,
      client_email: adminClientEmailMatch[1],
      client_id: '1',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
    };
    console.log('✓ Firebase Admin credentials loaded from .env.local\n');
  }
} catch (error) {
  console.error('❌ Error loading credentials from .env.local');
  console.log('\n⚠️  Firebase Admin SDK Setup Required:');
  console.log('────────────────────────────────────────────────────────────');
  console.log('1. Go to: https://console.firebase.google.com');
  console.log('2. Select project: emp-tool-56b9c');
  console.log('3. Project Settings → Service Accounts');
  console.log('4. Generate New Private Key');
  console.log('5. Add to .env.local:');
  console.log('   FIREBASE_ADMIN_PROJECT_ID=...');
  console.log('   FIREBASE_ADMIN_CLIENT_EMAIL=...');
  console.log('   FIREBASE_ADMIN_PRIVATE_KEY=...');
  console.log('────────────────────────────────────────────────────────────\n');
  rl.close();
  process.exit(1);
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'emp-tool-56b9c',
});

const db = admin.firestore();

async function createEmployeeDocs() {
  console.log('📝 Enter UIDs for your test users\n');
  console.log('(Find UIDs in Firebase Console → Authentication → Users)\n');

  const adminUid = await question('📧 Admin user UID (admin@test.com): ');
  const counsellorUid = await question('📞 Counsellor user UID (counsellor@test.com): ');

  if (!adminUid.trim() || !counsellorUid.trim()) {
    console.error('\n❌ Error: Both UIDs are required');
    rl.close();
    process.exit(1);
  }

  console.log('\n📂 Creating employee documents in Firestore...\n');

  const timestamp = admin.firestore.FieldValue.serverTimestamp();

  try {
    // Create admin document
    await db.collection('employees').doc(adminUid.trim()).set({
      email: 'admin@test.com',
      name: 'Test Admin',
      phone: '9876543210',
      role: 'ADMIN',
      isActive: true,
      dailyCallTarget: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await admin.auth().setCustomUserClaims(adminUid.trim(), {
      role: 'ADMIN',
      employeeId: adminUid.trim(),
    });
    console.log(`✅ Created: admin@test.com (UID: ${adminUid.trim()})`);

    // Create counsellor document
    await db.collection('employees').doc(counsellorUid.trim()).set({
      email: 'counsellor@test.com',
      name: 'Test Counsellor',
      phone: '9876543211',
      role: 'COUNSELLOR',
      isActive: true,
      dailyCallTarget: 25,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await admin.auth().setCustomUserClaims(counsellorUid.trim(), {
      role: 'COUNSELLOR',
      employeeId: counsellorUid.trim(),
    });
    console.log(`✅ Created: counsellor@test.com (UID: ${counsellorUid.trim()})`);

    console.log('\n═'.repeat(60));
    console.log('✅ Firestore Database Setup Complete!\n');
    console.log('🎯 Next Steps:');
    console.log('────────────────────────────────────────────────────────────');
    console.log('1. Visit: http://localhost:3001/login');
    console.log('2. Login with:');
    console.log('   Email: admin@test.com');
    console.log('   Password: test@123456');
    console.log('');
    console.log('3. Start testing the app!');
    console.log('────────────────────────────────────────────────────────────\n');

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating documents:', error.message);
    rl.close();
    process.exit(1);
  }
}

createEmployeeDocs();
