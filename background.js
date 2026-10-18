importScripts('config.js', 'llm-helper.js');
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') chrome.runtime.openOptionsPage();
});
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request?.action === 'askLLM') {
    if (sender.id !== chrome.runtime.id || !sender.tab?.url?.startsWith('https://learning.mheducation.com/')) {
      sendResponse({ success: false });
      return false;
    }
    if (typeof request.question !== 'string' || !Array.isArray(request.choices) ||
        !request.choices.every(choice => typeof choice === 'string') ||
        !['fill_in_blank', 'multiple_choice', 'true_false'].includes(request.questionType)) {
      sendResponse({ success: false });
      return false;
    }
    askLLM(request.question, request.choices, request.questionType)
      .then(sendResponse).catch(() => sendResponse({ success: false }));
    return true;
  }
  if (request?.data) sendResponse({ success: true, data: request.data });
  return false;
});
