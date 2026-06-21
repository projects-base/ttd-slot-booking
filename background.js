/* ================================================================
   TTD Bot — Background Service Worker  v2.0
   - Opens side panel when extension icon is clicked
   - Relays STATUS_UPDATE messages from content script → side panel
   ================================================================ */

// Open side panel when the toolbar icon is clicked
chrome.action.onClicked.addListener(tab => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Allow the side panel on all TTD pages
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (tab.url && tab.url.includes('ttdevasthanams.ap.gov.in')) {
    chrome.sidePanel.setOptions({ tabId, path: 'sidepanel.html', enabled: true });
  }
});

// Relay STATUS_UPDATE from content script → side panel
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'STATUS_UPDATE') {
    // Forward to side panel (suppress error if it is closed)
    chrome.runtime.sendMessage(msg).catch(() => {});
  }
  return true;
});

// Keep service worker alive during active booking window
chrome.alarms.create('keepAlive', { periodInMinutes: 0.4 });
chrome.alarms.onAlarm.addListener(() => { /* heartbeat */ });