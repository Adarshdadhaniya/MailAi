// content.js - Injects script and handles message passing

let currentStatus = null;

// Inject the page script
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

// Listen for messages from injected script
window.addEventListener('message', (event) => {
  // Only accept messages from same window
  if (event.source !== window) return;
  
  if (event.data.type && event.data.type.startsWith('AI_')) {
    currentStatus = event.data;
    
    // Forward to popup
    chrome.runtime.sendMessage(event.data, (response) => {
      // Handle response if needed
    });
    
    console.log('📤 Message forwarded to popup:', event.data.type);
  }
});

// Listen for requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATUS') {
    sendResponse({ status: currentStatus });
  }
  return true;
});