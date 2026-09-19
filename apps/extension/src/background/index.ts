import { handleExtensionMessage } from './messages.js';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'pinkless:compare') return false;
  void handleExtensionMessage(message, sender.tab?.url).then(sendResponse);
  return true;
});
