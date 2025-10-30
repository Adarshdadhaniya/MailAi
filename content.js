(() => {
  console.log("📩 Content script injector running...");
  try {
    const s = document.createElement("script");
    s.src = chrome.runtime.getURL("scripts/injected.js");
    s.onload = () => s.remove();
    (document.head || document.documentElement).appendChild(s);
    console.log("✅ Injected page script.");
  } catch (e) {
    console.error("❌ Failed to inject page script:", e);
  }
})();
