/**
 * OutreachPilot — service-worker.js
 */

const FREE_DAILY_LIMIT = 10;
const STORAGE_KEY = 'op_usage';
const LICENSE_KEY = 'op_license';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'OP_GET_STATUS') {
    getStatus().then(sendResponse);
    return true;
  }
  if (msg.type === 'OP_INCREMENT') {
    incrementUsage(msg.count || 1).then(sendResponse);
    return true;
  }
  if (msg.type === 'OP_ACTIVATE_LICENSE') {
    activateLicense(msg.key).then(sendResponse);
    return true;
  }
  if (msg.type === 'OP_REMOVE_LICENSE') {
    chrome.storage.local.remove(LICENSE_KEY, () => sendResponse({ ok: true }));
    return true;
  }
});

async function getStatus() {
  const [usage, lic] = await Promise.all([getUsage(), getLicense()]);
  const isPro = lic.valid;
  return {
    isPro,
    licenseKey: lic.key || null,
    usedToday: usage.count,
    remaining: isPro ? Infinity : Math.max(0, FREE_DAILY_LIMIT - usage.count),
    dailyLimit: FREE_DAILY_LIMIT
  };
}

async function getUsage() {
  return new Promise(resolve => {
    chrome.storage.local.get(STORAGE_KEY, r => {
      const s = r[STORAGE_KEY] || {};
      const today = todayStr();
      resolve(s.date === today ? { date: today, count: s.count || 0 } : { date: today, count: 0 });
    });
  });
}

async function incrementUsage(n) {
  const u = await getUsage();
  const newCount = u.count + n;
  await new Promise(r => chrome.storage.local.set({ [STORAGE_KEY]: { date: u.date, count: newCount } }, r));
  return { ok: true, usedToday: newCount };
}

async function getLicense() {
  return new Promise(resolve => {
    chrome.storage.local.get(LICENSE_KEY, r => {
      const d = r[LICENSE_KEY] || {};
      resolve({ valid: d.valid === true, key: d.key || null });
    });
  });
}

async function activateLicense(key) {
  if (!key || typeof key !== 'string') return { ok: false, error: 'Invalid key.' };
  const cleaned = key.trim().toUpperCase();
  if (!/^OP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleaned)) {
    return { ok: false, error: 'Invalid key. Format: OP-XXXX-XXXX-XXXX' };
  }
  await new Promise(r => chrome.storage.local.set({ [LICENSE_KEY]: { valid: true, key: cleaned, activatedAt: Date.now() } }, r));
  return { ok: true, key: cleaned };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
