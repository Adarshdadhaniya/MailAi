console.log("🔥 Firebase loader started...");

const loadLocal = (path) =>
  new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = chrome.runtime.getURL(path);
    s.onload = () => resolve();
    s.onerror = (e) => reject(e);
    document.documentElement.appendChild(s);
  });

(async () => {
  try {
    await loadLocal("firebase/firebase-app-compat.js");
    await loadLocal("firebase/firebase-firestore-compat.js");
    await loadLocal("scripts/firebase-init.js");
    console.log("✅ Firebase SDK + init script injected successfully.");
  } catch (err) {
    console.error("❌ Firebase injection error:", err);
  }
})();
