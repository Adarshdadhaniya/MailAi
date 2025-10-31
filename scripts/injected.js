/**********************************************************************
 * Gmail AI integration (injected script)
 * - Uses Firestore collection "mails" with documents { input, output }
 * - Uses Chrome built-in Prompt API (LanguageModel) and Summarizer API
 * - Waits for Firebase to be ready before querying
 * - Finds similar entries by asking the LanguageModel to return indices
 * - Builds an initialPrompts context from matched docs (input/output)
 * - Generates non-streamed reply via session.prompt()
 * - Summarizes incoming & outgoing messages and saves to Firestore 'mails'
 **********************************************************************/

(() => {
  if (window.__gmailAiInjected) {
    console.warn("[GMAIL-AI] Script already injected.");
    return;
  }
  window.__gmailAiInjected = true;

  const tag = "[GMAIL-AI]";
  const log = (...a) => console.log(tag, ...a);
  const warn = (...a) => console.warn(tag, ...a);
  const error = (...a) => console.error(tag, ...a);

  // singletons
  let summarizer = null;
  let aiSession = null;
  let writeCooldown = false;

  // ---------------- FIRESTORE READY / FETCH HELPERS ----------------
  // Wait for window.db to be available (firebase-init should dispatch firebase-ready)
  async function waitForFirebaseReady(maxMs = 15000) {
    if (window.db && typeof window.db.collection === "function") {
      return true;
    }
    log("Waiting for firebase-ready event...");
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        window.removeEventListener("firebase-ready", onReady);
        resolve(false);
      }, maxMs);

      function onReady() {
        clearTimeout(timeout);
        resolve(true);
      }
      window.addEventListener("firebase-ready", onReady, { once: true });
    });
  }

  // Robust fetch with diagnostic logs and retries
  async function fetchAllDocsFromCollection(collectionName, attempts = 3) {
    for (let i = 1; i <= attempts; i++) {
      try {
        if (!window.db || typeof window.db.collection !== "function") {
          throw new Error("Firestore (window.db) not ready");
        }
        const snapshot = await window.db.collection(collectionName).get();
        if (!snapshot) throw new Error("No snapshot returned");

        const docs = [];
        snapshot.forEach((doc) => {
          const data = typeof doc.data === "function" ? doc.data() : doc;
          // defensive mapping: ensure `input` and `output` exist
          docs.push({
            id: doc.id || null,
            input: data.input || (data.question || ""),
            output: data.output || (data.answer || ""),
          });
        });

        log(`Firestore fetch attempt ${i}: loaded ${docs.length} docs from '${collectionName}'`);
        return docs;
      } catch (err) {
        warn(`Firestore fetch attempt ${i} failed: ${err && err.message ? err.message : err}`);
        await new Promise((r) => setTimeout(r, 300 * i));
      }
    }
    throw new Error(`Failed to fetch docs from '${collectionName}' after ${attempts} attempts`);
  }

  // ---------------- GMAIL DOM EXTRACTION HELPERS ----------------
  function getLastIncoming() {
    try {
      // Gmail uses div.adn.ads for message blocks; adapt if DOM differs
      const msgs = Array.from(document.querySelectorAll("div.adn.ads"));
      if (!msgs.length) return null;
      const last = msgs[msgs.length - 1];
      const body = last.querySelector("div.a3s") || last;
      if (!body) return null;
      const quoted = body.querySelector(".gmail_quote");
      let text = body.innerText ? body.innerText.trim() : "";
      if (quoted && quoted.innerText) {
        text = text.replace(quoted.innerText.trim(), "").trim();
      }
      text = text.replace(/On\s.+?wrote:/s, "").trim();
      return text || null;
    } catch (e) {
      warn("getLastIncoming error:", e);
      return null;
    }
  }

  function getCleanSentMessage() {
    try {
      const msgs = Array.from(document.querySelectorAll("div.adn.ads"));
      if (!msgs.length) return null;
      const last = msgs[msgs.length - 1];
      const body = last.querySelector("div.a3s") || last;
      if (!body) return null;
      const quoted = body.querySelector(".gmail_quote");
      let text = body.innerText ? body.innerText.trim() : "";
      if (quoted && quoted.innerText) {
        text = text.replace(quoted.innerText.trim(), "").trim();
      }
      text = text.replace(/On\s.+?wrote:/s, "").trim();
      return text || null;
    } catch (e) {
      warn("getCleanSentMessage error:", e);
      return null;
    }
  }

  // Watches DOM for a new sent reply after clicking send
  function waitForNewReply(previousText, timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const body = document.body;

      function tryExtract() {
        const latest = getCleanSentMessage();
        if (latest && latest !== previousText) return latest;
        return null;
      }

      const initial = tryExtract();
      if (initial) return resolve(initial);

      const observer = new MutationObserver(() => {
        const found = tryExtract();
        if (found) {
          observer.disconnect();
          clearInterval(poll);
          return resolve(found);
        }
        if (Date.now() - start > timeoutMs) {
          observer.disconnect();
          clearInterval(poll);
          return reject(new Error("Timed out waiting for new reply"));
        }
      });
      observer.observe(body, { childList: true, subtree: true });

      const poll = setInterval(() => {
        try {
          const found = tryExtract();
          if (found) {
            observer.disconnect();
            clearInterval(poll);
            return resolve(found);
          }
          if (Date.now() - start > timeoutMs) {
            observer.disconnect();
            clearInterval(poll);
            return reject(new Error("Timed out waiting for new reply"));
          }
        } catch (e) {}
      }, 400);
    });
  }

  // ---------------- AI: Summarizer & Prompt flows ----------------
  async function initSummarizerIfNeeded(detail = "short") {
    try {
      // Return existing session if already initialized
      if (summarizer) return summarizer;

      // Check if Prompt API is available
      if (typeof LanguageModel === "undefined" || !LanguageModel.create) {
        console.warn("⚠ Prompt API not present on page");
        return null;
      }

      // Create the model session
      summarizer = await LanguageModel.create({
        monitor(m) {
          m.addEventListener("downloadprogress", (e) => {
            console.log(
              `⬇ Model download progress: ${(e.loaded * 100).toFixed(1)}%`
            );
          });
        }
      });

      console.log("✅ Summarizer (Prompt API) initialized");
      return summarizer;
    } catch (err) {
      console.warn("initSummarizerIfNeeded error:", err);
      return null;
    }
  }

  async function summarizeText(text, detail = "short") {
    try {
      const s = await initSummarizerIfNeeded(detail);
      if (!s) return text;

      // Create a tailored summarization prompt
      const prompt =
        detail === "full"
          ? `Provide a detailed, coherent summary preserving important details and clarity:\n\n${text}`
          : `Summarize this text briefly, extracting only essential key points:\n\n${text}`;

      console.log(`🧠 Summarizing (${detail})...`);
      const result = await s.prompt(prompt);

      return result?.trim() || text;
    } catch (err) {
      console.warn("summarizeText error:", err);
      return text;
    }
  }

  // Ask LanguageModel to identify similar inputs. Returns matched docs (subset).
  async function findSimilarQuestionsWithAI(receivedText, docs) {
    try {
      if (typeof LanguageModel === "undefined" || !LanguageModel.availability) {
        warn("LanguageModel not available");
        return [];
      }
      const availability = await LanguageModel.availability();
      log("LanguageModel.availability:", availability);
      if (availability === "unavailable") {
        return [];
      }

      // Truncate docs to avoid huge prompts (preserve top N)
      const MAX = 60;
      const included = docs.slice(0, MAX);

      // Build compact list of inputs for matching
      const inputsList = included.map((d, i) => `${i}. ${String(d.input || "").replace(/\s+/g, " ").slice(0, 300)}`);

      const promptSystem = "You are an assistant that identifies similar previous inputs to a new incoming email. Return ONLY the indices of similar inputs from the list, comma-separated (e.g. 0,3,5), or the word NONE if no match.";
      const promptUser = `Received Email: "${receivedText.replace(/\n/g, " ").slice(0, 800)}"\n\nPrevious Inputs:\n${inputsList.join("\n")}\n\nReturn indices relative to the list above, or NONE.`;

      const session = await LanguageModel.create({
        initialPrompts: [
          { role: "system", content: promptSystem },
          { role: "user", content: promptUser }
        ],
        monitor(m) {
          m.addEventListener("downloadprogress", (e) => {
            log("LanguageModel download progress:", `${(e.loaded * 100).toFixed(1)}%`);
          });
        }
      });

      const result = await session.prompt("Identify similar indices or NONE.");
      log("findSimilarQuestionsWithAI result:", result);

      if (!result || !result.trim()) return [];

      if (result.trim().toUpperCase() === "NONE") return [];

      // parse indices robustly
      const parsed = result
        .split(/[,\s]+/)
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isFinite(n) && n >= 0 && n < included.length);

      const uniqueIndices = Array.from(new Set(parsed));
      const matched = uniqueIndices.map((i) => included[i]);
      console.log(matched);
      log(`Matched ${matched.length} docs from ${included.length} included docs`);
      return matched;
    } catch (err) {
      error("findSimilarQuestionsWithAI error:", err);
      return [];
    }
  }

  // Create session using matchedDocs (input/output) as prior conversation and generate a reply
  async function generateAIResponse(receivedText, matchedDocs) {
    try {
      if (typeof LanguageModel === "undefined" || !LanguageModel.availability) {
        warn("LanguageModel not available for generation");
        return null;
      }
      const availability = await LanguageModel.availability();
      log("LanguageModel.availability for generation:", availability);
      if (availability === "unavailable") return null;

      const initialPrompts = [

        {

  role: "system",

  content: `

You are an AI responder that must generate replies strictly based on the information, rules, and examples provided in the initial prompt. 

Your job is to fully answer every user question using only the context, patterns, and logic given in that initial prompt — not any external facts or your own assumptions.



Guidelines:

1. Always respond in the same tone, style, and structure as shown in the examples.

2. Use the examples as factual and stylistic references — adapt them when a new question is similar.

3. If the user's message does not match any example exactly, make your best possible answer by analogical reasoning from similar examples.

4. Never mention being an AI or refer to yourself. Simply reply as the example responses would.

5. Always ensure the user’s question is completely and clearly answered using only the initial prompt’s context.

6. The goal is consistency, completeness, and coherence — your response must sound like it came from the same source as the examples.



In summary: All your replies must stay true to and fully informed by the initial prompt. Do not rely on outside knowledge.

`

}
      ];

      // Add matched docs as user/assistant turns (input => user, output => assistant)
      matchedDocs.forEach((d) => {
        initialPrompts.push({ role: "user", content: String(d.input || "") });
        initialPrompts.push({ role: "assistant", content: String(d.output || "") });
        console.log({role: "user", content: String(d.input || "")   });
        console.log({role: "assistant", content: String(d.output || "") });
      });

      aiSession = await LanguageModel.create({
        initialPrompts,
        temperature: 0.6,
        topK: 40,
        monitor(m) {
          m.addEventListener("downloadprogress", (e) => {
            log("LanguageModel (gen) download:", `${(e.loaded * 100).toFixed(1)}%`);
          });
        }
      });

      // Non-streamed call
      const reply = await aiSession.prompt(receivedText);
      log("AI generated reply:", reply && String(reply));
      return reply;
    } catch (err) {
      error("generateAIResponse error:", err);
      return null;
    }
  }

  // ---------------- Main flow when mail is opened ----------------
  async function handleMailOpen() {
    try {
      await new Promise((r) => setTimeout(r, 900)); // give Gmail time to render
      const incoming = getLastIncoming();
      if (!incoming) {
        log("No incoming message detected.");
        return;
      }
      log("New mail opened (snippet):", incoming.slice(0, 160));

      // Ensure Firestore ready and fetch training documents
      const ready = await waitForFirebaseReady();
      if (!ready) {
        warn("Firebase did not become ready in time.");
        return;
      }

      let trainingDocs = [];
      try {
        trainingDocs = await fetchAllDocsFromCollection("mails");
      } catch (err) {
        warn("fetchAllDocsFromCollection failed:", err);
        trainingDocs = [];
      }

      log(`Loaded ${trainingDocs.length} training docs`);

      if (!trainingDocs.length) {
        warn("No training data found in 'mails' collection.");
        return;
      }

      // Summarize incoming (short)
      const shortSummary = await summarizeText(incoming, "short");
      console.log("Short summary of incoming:", shortSummary);
      
      // Find matched docs using LanguageModel
      const matched = await findSimilarQuestionsWithAI(incoming, trainingDocs);

      if (!matched.length) {
        log("No similar training examples found.");
        return;
      }

      // Generate AI reply based on matched docs
      const aiReply = await generateAIResponse(incoming, matched);
      if (!aiReply) {
        error("AI generation failed.");
        return;
      }

      // Insert generated reply into Gmail compose box
      insertIntoReplyBox(String(aiReply));

      log(`✅ Response ready using ${matched.length} example(s)`);
    } catch (err) {
      error("handleMailOpen error:", err);
    }
  }

  // ---------------- When user clicks send (save conversation) ----------------
  async function handleSendButton(inputBeforeSend) {
    try {
      log("Capturing and saving conversation...");

      const reply = await waitForNewReply(inputBeforeSend, 15000).catch((e) => {
        warn("waitForNewReply timed out or errored:", e && e.message);
        return null;
      });

      if (!reply) {
        warn("No reply captured, aborting save.");
        return;
      }

      // Summaries
      const summarizedInput = await summarizeText(inputBeforeSend, "short");
      const summarizedOutput = await summarizeText(reply, "full");

      const doc = {
        input: summarizedInput,
        output: summarizedOutput,
      };

      // Save to 'mails' collection
      if (window.db && typeof window.db.collection === "function") {
        await window.db.collection("mails").add(doc);
        log("✅ Saved conversation to 'mails' collection");
      } else {
        warn("Cannot save: Firestore not ready.");
      }
    } catch (err) {
      error("handleSendButton error:", err);
    }
  }

  // ---------------- Observers: navigation and send clicks ----------------
  function observeMailNavigation() {
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        // Gmail uses hash fragments; adapt conditions as needed
        if (location.href.includes("#inbox/") || location.href.includes("#all/") || location.href.includes("#label/") || location.href.includes("/mail/")) {
          log("Detected mail view navigation. Processing...");
          setTimeout(handleMailOpen, 1100);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    log("Navigation observer installed");
  }

  // Send-button click listener (captures reply when user clicks send)
  function installSendListener() {
    if (window.__gmailSendListenerInstalled) return;
    window.__gmailSendListenerInstalled = true;

    document.body.addEventListener("click", async (e) => {
      try {
        const sendBtn = e.target && e.target.closest && e.target.closest('[aria-label^="Send"], [data-tooltip^="Send"]');
        if (!sendBtn) return;
        if (writeCooldown) return;
        writeCooldown = true;
        setTimeout(() => (writeCooldown = false), 4000);

        const inputBefore = getLastIncoming();
        log("Send clicked. Capturing reply for input snippet:", (inputBefore || "").slice(0, 120));
        await handleSendButton(inputBefore);
      } catch (err) {
        error("send listener error:", err);
      }
    }, true);

    log("Send listener installed");
  }

  // ---------------- Insert AI reply into Gmail compose box ----------------
  function insertIntoReplyBox(text) {
    try {
      const editable =
        document.querySelector('div[aria-label="Message Body"][contenteditable="true"]') ||
        document.querySelector('div[role="textbox"][g_editable="true"]') ||
        document.querySelector('div[aria-label="Message Body"]');

      if (!editable) {
        console.warn("[GMAIL-AI] Compose box not found. Please click reply first.");
        return false;
      }

      editable.focus();
      try {
        document.execCommand("selectAll", false, null);
        document.execCommand("insertText", false, text);
      } catch (err) {
        editable.innerText = text;
      }

      console.log("[GMAIL-AI] ✅ Inserted AI reply into compose box");
      return true;
    } catch (err) {
      console.warn("[GMAIL-AI] insertIntoReplyBox error:", err);
      return false;
    }
  }

  // ---------------- Init ----------------
  async function init() {
    if (window.__gmailAiInit) return;
    window.__gmailAiInit = true;

    log("Initializing Gmail AI injected script...");

    const firebaseReady = await waitForFirebaseReady();
    if (!firebaseReady) {
      warn("Firebase not ready when initializing; script will still attempt later when event fires.");
    } else {
      log("Firebase appears ready at init.");
    }

    // init summarizer proactively (optional)
    initSummarizerIfNeeded("short").catch((e) => warn("Summarizer init failed at startup:", e));

    observeMailNavigation();
    installSendListener();

    // If already on a mail view at load time, trigger analysis
    if (location.href.includes("#inbox/") || location.href.includes("#all/") || location.href.includes("/mail/")) {
      setTimeout(handleMailOpen, 1200);
    }

    log("✅ Initialization complete");
  }

  // expose debug helpers
  window.__gmailAIDebug = {
    fetchMails: async () => {
      if (!(await waitForFirebaseReady())) throw new Error("Firestore not ready");
      return await fetchAllDocsFromCollection("mails");
    },
    runMailOpen: async () => handleMailOpen(),
    summarizeNow: async (text) => summarizeText(text || "test", "short")
  };

  // start
  init();
})();