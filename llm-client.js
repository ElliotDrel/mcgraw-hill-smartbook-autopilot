async function askLLM(question, choices, questionType) {
  try {
    return await chrome.runtime.sendMessage({ action: 'askLLM', question, choices, questionType }) || { success: false };
  } catch {
    return { success: false };
  }
}
