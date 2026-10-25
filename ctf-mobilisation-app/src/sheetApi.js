// Talks to the CTF ENTEBBE Google Apps Script web app (the Google Sheet).
export const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbygaAjFxtwQmnUK8qZN4mKSdV5g0OcV-4snozEXmGhHSWnfhaYrUTcgZR_ECBIoG9c2_w/exec";

// How long to wait for the sheet to confirm a save. The script queues simultaneous
// submissions (up to 60s), so this leaves room for a busy moment.
const SAVE_TIMEOUT_MS = 120000;

// Friendlier wording for errors the script can send back
const SERVER_MESSAGES = {
  'Server busy, please try again': 'The server is busy right now. Your data was not saved. Please wait a moment and try again.',
  'Sheet not found': 'Your data was not saved: the sheet for this category could not be found. Please tell the coordinator.',
};

class SaveError extends Error {}

// Sends one submission and waits for the sheet to confirm it was saved.
// Resolves on success; otherwise throws an Error whose message can be shown to the user.
export async function submitToSheet(payload, { timeoutMs = SAVE_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let text;
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      // text/plain keeps this a "simple" request: no CORS preflight (which Apps Script can't answer),
      // and the script's reply can still be read.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new SaveError(`The server returned an error (HTTP ${response.status}). Your data was not saved. Please try again.`);
    }
    text = await response.text();
  } catch (err) {
    if (err instanceof SaveError) throw err;
    if (err.name === 'AbortError') {
      throw new SaveError("No reply from the server in time, so we can't confirm your data was saved. Please check your connection and try again.");
    }
    throw new SaveError("Couldn't reach the server, so your data was not saved. Please check your internet connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  let result;
  try {
    result = JSON.parse(text);
  } catch {
    throw new SaveError('The server sent an unexpected reply, so your data may not have been saved. Please try again.');
  }

  if (!result || result.status !== 'success') {
    const message = result && result.message ? String(result.message) : 'unknown error';
    throw new SaveError(SERVER_MESSAGES[message] || `Your data was not saved (${message}). Please try again.`);
  }
  return result;
}
