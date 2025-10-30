# Gmail Scraper → Firebase Chrome Extension

This Chrome extension scrapes Gmail messages (received & replies) and stores them in Firebase Firestore. It automatically captures input/output pairs when you send replies in Gmail threads.

## Setup Instructions

### 1. Firebase Setup
- Create a Firebase project at https://console.firebase.google.com/
- Enable Firestore Database
- Get your Firebase config from Project Settings > General > Your apps
- Update `firebase.js` with your actual Firebase config values

### 2. Install Extension
- Open Chrome and go to `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked" and select this folder
- The extension should now be installed

### 3. Usage
- Open Gmail in Chrome
- Open any email thread
- Compose and send a reply
- The extension automatically captures the last incoming message (input) and your reply (output)
- Data is saved to Firestore "mails" collection with input/output pairs

## Files
- `manifest.json` - Extension manifest
- `content.js` - Content script that runs on Gmail pages and captures send events
- `firebase.js` - Firebase configuration
- `README.md` - This file
