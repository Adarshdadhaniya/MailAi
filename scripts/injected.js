(() => {
  if (window.__gmailFirebaseListenerInstalled) return;
  window.__gmailFirebaseListenerInstalled = true;

  const log = (...a) => console.log(...a);
  const warn = (...a) => console.warn(...a);
  const error = (...a) => console.error(...a);
  let writeCooldown = false;

  function getLastIncoming() {
    const msgs = Array.from(document.querySelectorAll("div.adn.ads"));
    if (!msgs.length) return null;
    const lastMsg = msgs[msgs.length - 1];
    const body = lastMsg.querySelector("div.a3s");
    if (!body) return null;
    const quoted = body.querySelector(".gmail_quote");
    let text = body.innerText ? body.innerText.trim() : "";
    if (quoted && quoted.innerText) {
      text = text.replace(quoted.innerText.trim(), "").trim();
    }
    return text || null;
  }

  function getCleanSentMessage() {
    const msgs = Array.from(document.querySelectorAll("div.adn.ads"));
    if (!msgs.length) return null;
    const lastMessage = msgs[msgs.length - 1];
    const messageBody = lastMessage.querySelector("div.a3s");
    if (!messageBody) return null;
    const quoted = messageBody.querySelector(".gmail_quote");
    let text = messageBody.innerText ? messageBody.innerText.trim() : "";
    if (quoted && quoted.innerText) {
      text = text.replace(quoted.innerText.trim(), "").trim();
    }
    text = text.replace(/On .* wrote:/s, "").trim();
    return text || null;
  }

  function waitForNewReply(previousText, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const app = document.body;
      const tryExtract = () => {
        const latest = getCleanSentMessage();
        if (latest && latest !== previousText) return latest;
        return null;
      };

      const initial = tryExtract();
      if (initial) {
        resolve(initial);
        return;
      }

      const observer = new MutationObserver(() => {
        const found = tryExtract();
        if (found) {
          observer.disconnect();
          resolve(found);
        } else if (Date.now() - start > timeoutMs) {
          observer.disconnect();
          reject(new Error("Timed out waiting for new reply"));
        }
      });
      observer.observe(app, { childList: true, subtree: true });

      const timer = setInterval(() => {
        if (Date.now() - start > timeoutMs) {
          clearInterval(timer);
          observer.disconnect();
          reject(new Error("Timed out waiting for new reply"));
        }
        const found = tryExtract();
        if (found) {
          clearInterval(timer);
          observer.disconnect();
          resolve(found);
        }
      }, 300);
    });
  }

  async function waitForFirebaseReady(maxMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      if (window.db && typeof window.db.collection === "function") return true;
      if (
        window.firebase &&
        typeof window.firebase.firestore === "function"
      ) {
        try {
          window.db = window.db || window.firebase.firestore();
          if (window.db) return true;
        } catch (e) {}
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    return false;
  }

  async function init() {
    if (window.__gmailInitDone) return;
    window.__gmailInitDone = true;
    const ready = await waitForFirebaseReady();
    if (!ready) {
      error("❌ Firestore not ready after waiting.");
      return;
    }

    log("✅ Firebase fully ready in Gmail tab!");
    if (window.__gmailSendListenerInstalled) return;
    window.__gmailSendListenerInstalled = true;

    document.body.addEventListener(
      "click",
      async (e) => {
        const sendBtn = e.target && (e.target.closest && e.target.closest('[aria-label^="Send"], [data-tooltip^="Send"]'));
        if (!sendBtn) return;
        if (writeCooldown) return;
        writeCooldown = true;
        setTimeout(() => (writeCooldown = false), 4000);

        // Snapshot the incoming message BEFORE Gmail updates the DOM with your reply
        const inputBeforeSend = getLastIncoming();
        log("✈️ Send clicked. Waiting for Gmail to update...");
        try {
          const reply = await waitForNewReply(inputBeforeSend, 12000);
          if (!reply) {
            warn("⚠️ No reply detected.");
            return;
          }
          const emailDoc = { input: inputBeforeSend || "(no incoming text)", output: reply };
          await window.db.collection("mails").add(emailDoc);
          log("✅ Saved to Firestore 'mails' collection:", emailDoc);
        } catch (err) {
          error("❌ Firestore Error:", err);
        }
      },
      true
    );

    log("🔍 Gmail reply listener active!");
  }

  window.addEventListener("firebase-ready", init, { once: true });
  setTimeout(init, 3000);
})();
