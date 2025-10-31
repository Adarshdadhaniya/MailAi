// popup.js - Extension popup UI controller

const content = document.getElementById('content');

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AI_STATUS') {
    updateStatus(message.data);
  } else if (message.type === 'AI_RESPONSE') {
    showAIResponse(message.data);
  } else if (message.type === 'AI_ERROR') {
    showError(message.data);
  }
});

// Request current status when popup opens
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATUS' }, (response) => {
      if (response && response.status) {
        updateStatus(response.status);
      }
    });
  }
});

function updateStatus(data) {
  content.innerHTML = '';
  
  const statusBox = document.createElement('div');
  statusBox.className = 'status-box';
  
  let icon = '🔵';
  let badge = 'info';
  
  if (data.type === 'success') {
    icon = '✅';
    badge = 'success';
  } else if (data.type === 'error') {
    icon = '❌';
    badge = 'warning';
  } else if (data.type === 'processing') {
    icon = '<span class="loader"></span>';
  }
  
  statusBox.innerHTML = `
    <h3>${icon} ${data.title || 'Status'} <span class="badge ${badge}">${data.status || 'Active'}</span></h3>
    <p>${data.message || 'Waiting for activity...'}</p>
  `;
  
  content.appendChild(statusBox);
}

function showAIResponse(data) {
  const responseBox = document.createElement('div');
  responseBox.className = 'ai-response';
  
  const title = document.createElement('h3');
  title.textContent = '🤖 AI Generated Response';
  
  const responseText = document.createElement('pre');
  responseText.textContent = data.response || 'No response generated';
  
  responseBox.appendChild(title);
  responseBox.appendChild(responseText);
  
  if (data.matches) {
    const matchInfo = document.createElement('p');
    matchInfo.style.cssText = 'margin-top: 10px; font-size: 12px; color: #666;';
    matchInfo.textContent = `Found ${data.matches} similar question(s) in database`;
    responseBox.appendChild(matchInfo);
  }
  
  content.appendChild(responseBox);
}

function showError(data) {
  const errorBox = document.createElement('div');
  errorBox.className = 'status-box';
  errorBox.style.background = 'rgba(244, 67, 54, 0.2)';
  errorBox.style.borderColor = 'rgba(244, 67, 54, 0.5)';
  
  errorBox.innerHTML = `
    <h3>❌ Error</h3>
    <p>${data.message || 'An error occurred'}</p>
  `;
  
  content.appendChild(errorBox);
}


