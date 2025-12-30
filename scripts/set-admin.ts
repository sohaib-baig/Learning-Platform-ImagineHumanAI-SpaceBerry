// scripts/set-admin.ts
import admin from "firebase-admin";
import { readFileSync } from "fs";

const raw = readFileSync("./service-account.json", "utf8");
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(raw) as any),
});

async function setAdminClaim(uid: string) {
  if (!uid) throw new Error("Usage: tsx scripts/set-admin.ts <UID>");
  await admin.auth().setCustomUserClaims(uid, { admin: true });
  const user = await admin.auth().getUser(uid);
  console.log("✅ Set admin=true for UID:", uid, "claims:", user.customClaims);
}

setAdminClaim(process.argv[2]).catch((e) => {
  console.error("❌ Failed to set admin claim:", e);
  process.exit(1);
});
