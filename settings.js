const keyInput = document.getElementById('key');
const status = document.getElementById('status');
chrome.storage.local.get(['openaiApiKey', 'aiDisabled']).then(({ openaiApiKey, aiDisabled }) => {
  status.textContent = openaiApiKey && !aiDisabled ? 'AI key saved. Leave the field blank to keep it.' : 'No key needed. You can start without AI.';
}).catch(() => { status.textContent = 'Could not read settings. Reopen this page to try again.'; });
document.getElementById('settings').addEventListener('submit', async event => {
  event.preventDefault();
  const key = keyInput.value.trim();
  if (!key.startsWith('sk-') || key.length < 20) {
    status.textContent = 'Paste an OpenAI API key, or choose Continue without AI.';
    return;
  }
  try {
    await chrome.storage.local.set({ openaiApiKey: key, aiDisabled: false });
    keyInput.value = '';
    status.textContent = 'Key saved. AI will be used for new questions. You can close this tab.';
  } catch { status.textContent = 'Could not save your key. Please try again.'; }
});
async function removeKey() {
  try {
    await chrome.storage.local.set({ aiDisabled: true });
    await chrome.storage.local.remove('openaiApiKey');
    keyInput.value = '';
    status.textContent = 'Ready without AI. You can close this tab and open your assignment.';
  } catch { status.textContent = 'Could not update settings. Please try again.'; }
}
document.getElementById('skip').addEventListener('click', removeKey);
document.getElementById('remove').addEventListener('click', removeKey);
