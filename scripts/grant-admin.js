/**
 * Grant the Firebase custom claim { admin: true } to a user.
 * Usage: node scripts/grant-admin.js <uid>
 *
 * Auth: prefers GOOGLE_APPLICATION_CREDENTIALS; falls back to ../service-account.json.
 */
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

function initAdmin() {
  if (admin.apps.length) return;

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp();
    return;
  }

  const fallbackPath = path.resolve(__dirname, "../service-account.json");
  if (!fs.existsSync(fallbackPath)) {
    throw new Error(
      "No GOOGLE_APPLICATION_CREDENTIALS set and service-account.json not found."
    );
  }

  const serviceAccount = require(fallbackPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function main() {
  const uid = process.argv[2];
  if (!uid) {
    throw new Error("Usage: node scripts/grant-admin.js <uid>");
  }

  initAdmin();
  const auth = admin.auth();

  const user = await auth.getUser(uid);
  const existingClaims = user.customClaims || {};
  const updatedClaims = { ...existingClaims, admin: true };

  await auth.setCustomUserClaims(uid, updatedClaims);

  console.log(`✅ Set admin claim for ${uid}`);
  console.log("Note: User must sign out/in for the new claim to take effect.");
}

main().catch((err) => {
  console.error("Failed to grant admin:", err);
  process.exit(1);
});
