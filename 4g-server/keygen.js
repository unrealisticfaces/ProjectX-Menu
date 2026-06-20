// keygen.js - PRIVATE ADMIN SCRIPT (Do not distribute this file!)
const readline = require('readline');

// 💥 YOUR FIREBASE DATABASE URL 💥
const FIREBASE_DB_URL = "https://projectx-data-default-rtdb.asia-southeast1.firebasedatabase.app";

async function generateKey(tier) {
  console.log(`Generating new ${tier} license key...\n`);

  const randomStr = Math.random().toString(36).substring(2, 10).toUpperCase();
  const newKey = `4G-${tier.toUpperCase()}-${randomStr}`;

  const licenseData = {
    isActive: true,
    tier: tier,
    hwid: "", 
    createdAt: new Date().toISOString(),
    adminKey: "5y5@dm1nistrator-Keith" // Matches Firebase security rules
  };

  try {
    const response = await fetch(`${FIREBASE_DB_URL}/licenses/${newKey}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(licenseData)
    });

    if (response.ok) {
      console.log(`========================================`);
      console.log(`✅ SUCCESS! NEW KEY GENERATED`);
      console.log(`========================================`);
      console.log(`Product Key : ${newKey}`);
      console.log(`Tier        : ${tier}`);
      console.log(`Status      : Ready to be sold!`);
      console.log(`========================================\n`);
    } else {
      console.log(`❌ Failed to save to Firebase. Check your Database Rules.`);
    }
  } catch (error) {
    console.log(`❌ Network Error: Could not reach Firebase.`);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Highlight the key, press Ctrl+C to copy, then press Enter to close this window...', () => {
    rl.close();
  });
}

generateKey('PRO');