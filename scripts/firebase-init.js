console.log("⚡ Firebase init starting...");

try {
  const firebaseConfig = {
    apiKey: "AIzaSyCQ6rY2mBv70tAJM0Kya3K4vaeyWWCSUsY",
    authDomain: "trial-5a2ce.firebaseapp.com",
    projectId: "trial-5a2ce",
    storageBucket: "trial-5a2ce.firebasestorage.app",
    messagingSenderId: "295229771176",
    appId: "1:295229771176:web:567cab1082e9dd5bf1a19d",
    measurementId: "G-60VCE93PFZ"
  };

  // Wait for Firebase global to exist (since scripts load async)
  const waitForFirebase = async () => {
    for (let i = 0; i < 40; i++) {
      if (window.firebase && window.firebase.initializeApp) return true;
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error("Firebase not found after loading scripts.");
  };

  (async () => {
    await waitForFirebase();
    window.firebaseApp = firebase.initializeApp(firebaseConfig);
    window.db = firebase.firestore();

    console.log("🔥 Firebase initialized and Firestore ready!");
    window.dispatchEvent(new CustomEvent("firebase-ready"));
  })();
} catch (err) {
  console.error("❌ Firebase init error:", err);
}
