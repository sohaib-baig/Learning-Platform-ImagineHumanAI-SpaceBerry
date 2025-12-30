import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert(require("../service-account.json")),
  });
}

const db = getFirestore();

async function addRecommendation() {
  try {
    // Find ImagineHumans Academy club by slug
    const academyQuery = await db
      .collection("clubs")
      .where("info.slug", "==", "imaginehumans")
      .limit(1)
      .get();

    if (academyQuery.empty) {
      console.error("❌ ImagineHumans Academy club not found!");
      console.log("   Make sure the club with slug 'imaginehumans' exists in Firestore.");
      process.exit(1);
    }

    const academyDoc = academyQuery.docs[0];
    const academyId = academyDoc.id;
    const academyData = academyDoc.data();
    console.log("✅ Found ImagineHumans Academy club:");
    console.log(`   Club ID: ${academyId}`);
    console.log(`   Club Name: ${academyData.info?.name || "N/A"}`);

    // Find Zero Grounds club by slug
    const zeroGroundsQuery = await db
      .collection("clubs")
      .where("info.slug", "==", "zero-grounds")
      .limit(1)
      .get();

    if (zeroGroundsQuery.empty) {
      console.error("❌ Zero Grounds club not found!");
      console.log("   Make sure the club with slug 'zero-grounds' exists in Firestore.");
      console.log("   You may need to run: npm run create:test-club");
      process.exit(1);
    }

    const zeroGroundsDoc = zeroGroundsQuery.docs[0];
    const zeroGroundsId = zeroGroundsDoc.id;
    const zeroGroundsData = zeroGroundsDoc.data();
    console.log("\n✅ Found Zero Grounds club:");
    console.log(`   Club ID: ${zeroGroundsId}`);
    console.log(`   Club Name: ${zeroGroundsData.info?.name || "N/A"}`);

    // Check if already recommended
    const currentRecommended = academyData.info?.recommendedClubs || [];
    if (currentRecommended.includes(zeroGroundsId)) {
      console.log("\n⚠️  Zero Grounds is already in the recommended clubs list!");
      console.log("   No changes needed.");
      process.exit(0);
    }

    // Add Zero Grounds to recommended clubs
    await academyDoc.ref.update({
      "info.recommendedClubs": FieldValue.arrayUnion(zeroGroundsId),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log("\n✅ Successfully added Zero Grounds to ImagineHumans Academy recommendations!");
    console.log(`   Updated recommendedClubs array with club ID: ${zeroGroundsId}`);
    console.log(
      `\n   You can verify this at: http://localhost:3000/club/imaginehumans/dashboard (Recommended Clubs tab)`
    );
  } catch (error) {
    console.error("❌ Error adding recommendation:", error);
    process.exit(1);
  }
}

addRecommendation()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });

