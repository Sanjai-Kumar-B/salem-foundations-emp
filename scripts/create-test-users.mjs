#!/usr/bin/env node

/**
 * Create Test Users for Employee Management System
 * Creates admin and counsellor test accounts
 * 
 * Usage:
 *   node scripts/create-test-users.mjs
 * 
 * Test Credentials Created:
 *   Admin: admin@test.com / test@123456
 *   Counsellor: counsellor@test.com / test@123456
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the project root (two levels up from scripts/)
const projectRoot = dirname(dirname(__dirname));

console.log('\n🚀 Employee Management System - Test User Setup');
console.log('═'.repeat(60));

// Try to load service account from environment or files
let serviceAccount;
const projectId = 'emp-tool-56b9c';

try {
  // First try: Load from .env.local FIREBASE_ADMIN_* variables
  const envPath = join(projectRoot, 'Empolyee_Management', '.env.local');
  const envContent = readFileSync(envPath, 'utf8');
  
  // Parse basic env vars (simple approach)
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
    console.log('✓ Loaded admin credentials from .env.local');
  } else {
    throw new Error('Missing FIREBASE_ADMIN_* variables');
  }
} catch (error) {
  console.error('❌ Error loading credentials:', error.message);
  console.log('\n⚠️  Setup Instructions:');
  console.log('────────────────────────────────────────────────────────────');
  console.log('To create test users, you need Firebase Admin SDK credentials.');
  console.log('');
  console.log('1. Go to Firebase Console: https://console.firebase.google.com');
  console.log('2. Select project: emp-tool-56b9c');
  console.log('3. Navigate to: Project Settings → Service Accounts');
  console.log('4. Click "Generate New Private Key"');
  console.log('5. Add these values to .env.local:');
  console.log('');
  console.log('   FIREBASE_ADMIN_PROJECT_ID="emp-tool-56b9c"');
  console.log('   FIREBASE_ADMIN_CLIENT_EMAIL="firebase-adminsdk-xxxxx@emp-tool-56b9c.iam.gserviceaccount.com"');
  console.log('   FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
  console.log('');
  console.log('6. Then run: node scripts/create-test-users.mjs');
  console.log('────────────────────────────────────────────────────────────\n');
  process.exit(1);
}

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: projectId,
});

const auth = admin.auth();
const db = admin.firestore();

// Test user data
const testUsers = [
  {
    email: 'admin@test.com',
    password: 'test@123456',
    displayName: 'Test Admin',
    role: 'ADMIN',
    name: 'Test Admin',
    phone: '9876543210',
  },
  {
    email: 'counsellor@test.com',
    password: 'test@123456',
    displayName: 'Test Counsellor',
    role: 'COUNSELLOR',
    name: 'Test Counsellor',
    phone: '9876543211',
  },
];

async function createTestUsers() {
  console.log('\n📝 Creating test users...\n');

  for (const userData of testUsers) {
    try {
      // Check if user already exists
      let user;
      try {
        user = await auth.getUserByEmail(userData.email);
        console.log(`ℹ️  User already exists: ${userData.email}`);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          // Create new Firebase Auth user
          user = await auth.createUser({
            email: userData.email,
            password: userData.password,
            displayName: userData.displayName,
            emailVerified: true,
          });
          console.log(`✓ Created Firebase Auth user: ${userData.email}`);
        } else {
          throw error;
        }
      }

      // Create/update Firestore employee document
      const employeeRef = db.collection('employees').doc(user.uid);
      const employeeDoc = await employeeRef.get();

      if (employeeDoc.exists) {
        console.log(`ℹ️  Firestore employee doc already exists for ${userData.email}`);
      } else {
        await employeeRef.set({
          email: userData.email,
          name: userData.name,
          phone: userData.phone,
          role: userData.role,
          isActive: true,
          dailyCallTarget: userData.role === 'COUNSELLOR' ? 25 : 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✓ Created Firestore employee doc: ${userData.email}`);
      }

      console.log(`  UID: ${user.uid}`);
      console.log(`  Role: ${userData.role}`);
      console.log('');
    } catch (error) {
      console.error(`❌ Error creating user ${userData.email}:`, error.message);
    }
  }

  console.log('═'.repeat(60));
  console.log('✅ Test User Setup Complete!\n');
  console.log('📋 Test Credentials:');
  console.log('────────────────────────────────────────────────────────────');
  console.log('Admin User:');
  console.log('  Email:    admin@test.com');
  console.log('  Password: test@123456');
  console.log('');
  console.log('Counsellor User:');
  console.log('  Email:    counsellor@test.com');
  console.log('  Password: test@123456');
  console.log('────────────────────────────────────────────────────────────\n');

  process.exit(0);
}

// Run the setup
createTestUsers().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
