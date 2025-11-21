// Background script for SEO Keyword Checker extension
// Handles extension lifecycle events.

chrome.runtime.onInstalled.addListener(() => {
    console.log('SEO Keyword Checker extension installed');
    // You can perform one-time setup here if needed.
});

// Optional: listen for messages from other parts (if needed)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Currently no specific background messages are required.
    // Placeholder for future functionality.
    return true; // Keep the message channel open if async response needed.
});
