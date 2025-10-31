# 💌 Threadless — Turning Inbox Overload into Instant Insight  
> 🏆 Built for the Google Hackathon | ⚡ Powered by the Prompt API | 🔥 Open Source

![Threadless](https://img.shields.io/badge/Threadless-Open_Source-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Hackathon](https://img.shields.io/badge/Built_For-Google_Hackathon-red?style=for-the-badge)
![API](https://img.shields.io/badge/Powered_By-Prompt_API-orange?style=for-the-badge)

---

## 🚀 Overview  
**Threadless** is a **Chrome extension** that declutters your Gmail experience by instantly **summarizing long email threads** using the **Prompt API**.  
It reads, understands, and compresses your messages into clean, human-friendly summaries — right where you need them.  

Because productivity isn’t about reading more — it’s about understanding faster. ⚡  

---

## 🧠 How It Works  

1. **🔐 Firebase Connection**  
   - On initialization, Threadless connects securely to **Firebase**, verifying user sessions and managing summary storage.

2. **📩 Email Detection**  
   - As soon as you open a Gmail thread, the extension automatically identifies and extracts the **latest incoming message**.

3. **🧾 Pre-Processing**  
   - Cleans out greetings, signatures, disclaimers, and repeated replies — keeping only meaningful context.

4. **🪄 Smart Summarization**  
   - The cleaned message is sent to the **Prompt API**, which returns two summaries:  
     - **Short Summary** → quick insight view  
     - **Full Summary** → detailed breakdown with context  

5. **🔍 Smart Cache & Firebase Check**  
   - Before summarizing, Threadless checks **Firebase** to see if the email (by hash) was summarized earlier.  
   - If found → instantly loads existing summary.  
   - If new → generates fresh one and saves it with rich metadata.

6. **💾 Storage & Analytics**  
   - Summaries, metadata (timestamp, sessionId, inputType), and performance logs are stored in Firebase for analytics and future retrieval.

---

## 🧩 Tech Stack  

- **Frontend:** Chrome Extension (HTML + JS + CSS)  
- **Backend:** Firebase Realtime Database  
- **AI Layer:** Prompt API (non-streamed mode)  
- **Storage:** Firebase JSON entries with hashing  
- **Auth:** Firebase Authentication  

---

## 🌈 Key Features  

- 🧠 AI-powered Gmail summarization  
- ⚡ Real-time context extraction  
- 💬 Dual-mode summary (short + full)  
- 🔍 Smart caching to prevent duplicates  
- ☁️ Firebase-based analytics and logging  
- 🪶 Lightweight & privacy-friendly  

---

## 🧪 Demo Flow  

1. Open Gmail → Select a long email thread  
2. Threadless detects and extracts the message  
3. Summarization triggered via **Prompt API**  
4. Summary instantly appears below the thread  
5. Stored in Firebase for search and metrics  

---

## 💡 Vision  

Threadless is built to make communication smarter.  
Future updates will bring **semantic search**, **smart reply suggestions**, and **AI-based trend detection** across emails.  

---

## 👐 Open Source  

This project is proudly **open-source**.  
Contributions, pull requests, and creative ideas are always welcome!  

```bash
git clone https://github.com/Adarshdadhaniya/Threadless.git
cd Threadless
