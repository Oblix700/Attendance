import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB6DRZdeQGWTBAuC7_HxNmRJKV08xnFxaA",
  authDomain: "attendance-reg-f0b1a.firebaseapp.com",
  projectId: "attendance-reg-f0b1a",
  storageBucket: "attendance-reg-f0b1a.firebasestorage.app",
  messagingSenderId: "261704538030",
  appId: "1:261704538030:web:542a811ae8f1cb2aa11a3f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runTest() {
  console.log("🚀 Starting Firebase Connectivity Test...");
  
  try {
    // 1. Create
    console.log("📝 Attempting to write test attendee...");
    const testDoc = await addDoc(collection(db, 'attendees'), {
      fullName: "Test User",
      email: "test@example.com",
      status: "present",
      timestamp: Date.now(),
      isTest: true
    });
    console.log("✅ Write Successful! Doc ID:", testDoc.id);

    // 2. Read
    console.log("🔍 Attempting to read back test attendee...");
    const q = query(collection(db, 'attendees'), where('isTest', '==', true));
    const querySnapshot = await getDocs(q);
    console.log(`✅ Read Successful! Found ${querySnapshot.size} test documents.`);

    // 3. Delete
    console.log("🗑️ Attempting to delete test data...");
    for (const d of querySnapshot.docs) {
      await deleteDoc(doc(db, 'attendees', d.id));
    }
    console.log("✅ Delete Successful!");

    console.log("\n🎉 ALL SYSTEMS GREEN: Database is linked and working!");
  } catch (error) {
    if (error.code === 'permission-denied') {
      console.error("\n❌ ERROR: Permission Denied. Have you enabled Firestore and set it to 'Test Mode' in the Firebase Console?");
    } else {
      console.error("\n❌ ERROR:", error.message);
    }
    process.exit(1);
  }
}

runTest();
