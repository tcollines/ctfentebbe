// Detects when a newer version of the app has been deployed, so phones that keep the
// page open are prompted to load it.
//
// Every Vercel build gives the app's script a new file name (/assets/index-XXXX.js).
// If the live page now points to a different file than the one running on this phone,
// a new version is out. index.html is served with "max-age=0, must-revalidate", so a
// plain reload is enough to pick the new version up.
import { useEffect, useState } from 'react';

const BUNDLE_RE = /\/assets\/index-[\w-]+\.js/;
const CHECK_EVENT = 'ctf:check-for-update';
const RELOAD_KEY = 'ctf:last-update-reload';
const CHECK_EVERY_MS = 5 * 60 * 1000;

// The script file this phone is running, or null on the dev server
const runningBundle = () => {
  const el = document.querySelector('script[type="module"][src*="/assets/index-"]');
  const match = el && (el.getAttribute('src') || '').match(BUNDLE_RE);
  return match ? match[0] : null;
};

export async function isUpdateAvailable() {
  const current = runningBundle();
  if (!current) return false;
  try {
    const res = await fetch(`/?_v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return false;
    const latest = (await res.text()).match(BUNDLE_RE);
    return !!latest && latest[0] !== current;
  } catch {
    return false; // offline: the next check will try again
  }
}

// Ask the app to check now (used after each submission)
export const requestUpdateCheck = () => window.dispatchEvent(new Event(CHECK_EVENT));

// Reloads the page to load the new version. Automatic reloads happen at most once a
// minute, so a slow deployment can't cause a reload loop; a tap on Update always reloads.
export function reloadForUpdate({ userInitiated = false } = {}) {
  if (!userInitiated) {
    try {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      if (Date.now() - last < 60 * 1000) return false;
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch {
      // storage blocked: reload anyway
    }
  }
  window.location.reload();
  return true;
}

// true once a newer version is live. Checks when the app opens, whenever the user comes
// back to the tab, every 5 minutes, and after each submission.
export function useUpdateAvailable() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (await isUpdateAvailable() && !cancelled) setAvailable(true);
    };
    const onVisible = () => { if (!document.hidden) check(); };

    check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(CHECK_EVENT, check);
    const timer = setInterval(check, CHECK_EVERY_MS);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(CHECK_EVENT, check);
      clearInterval(timer);
    };
  }, []);

  return available;
}
