import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert(require("../service-account.json")),
  });
}

const db = getFirestore();

async function createTestClub() {
  const hostId = "extxxYWJptdYT4xCrAp02rdkROX2";

  const clubData = {
    info: {
      name: "Zero Grounds",
      slug: "zero-grounds",
      description:
        "A safe sandbox club used to validate new capabilities before they reach members.",
      vision: "A test club for development and testing purposes",
      mission: "To provide a safe environment for testing new features",
      bannerUrl: "", // Optional: Add a banner URL if you want
      benefits: [
        "Access to test content",
        "Early preview of new features",
        "Testing environment",
      ],
      price: 9.99, // Monthly price in AUD
      currency: "AUD",
      reviews: [],
      recommendedClubs: [],
    },
    hostId: hostId,
    membersCount: 0,
    meta: {
      badges: {
        activeHost: false,
        communityBuilder: false,
        featuredByImagineHumans: false,
      },
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  try {
    // Create the club
    const clubRef = await db.collection("clubs").add(clubData);
    console.log("✅ Club created successfully!");
    console.log("Club ID:", clubRef.id);
    console.log("Club Name: Zero Grounds");
    console.log("Slug: zero-grounds");
    console.log("Host ID:", hostId);

    // Update the host's clubsHosted array
    const userRef = db.doc(`users/${hostId}`);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      await userRef.update({
        clubsHosted: FieldValue.arrayUnion(clubRef.id),
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log("✅ Updated host's clubsHosted array");
    } else {
      console.warn("⚠️  Host user document doesn't exist. Creating it...");
      await userRef.set({
        uid: hostId,
        clubsJoined: [],
        clubsHosted: [clubRef.id],
        roles: { user: true, host: true },
        hostStatus: { enabled: true },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log("✅ Created host user document");
    }

    console.log("\n🎉 Test club 'Zero Grounds' created successfully!");
    console.log(
      `\nAccess it at: http://localhost:3000/club/zero-grounds/overview`
    );
  } catch (error) {
    console.error("❌ Error creating club:", error);
    process.exit(1);
  }
}

createTestClub()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
