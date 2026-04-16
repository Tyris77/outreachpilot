/**
 * OutreachPilot — content-script.js
 * Extracts emails and phone numbers from the current page.
 */

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'OP_PING') {
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === 'OP_SCAN_PAGE') {
    try {
      const results = scanPage();
      sendResponse({ ok: true, ...results });
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }
    return false;
  }

  if (msg.type === 'OP_SCAN_DEEP') {
    scanDeep()
      .then(results => sendResponse({ ok: true, ...results }))
      .catch(err  => sendResponse({ ok: false, error: err.message }));
    return true; // async
  }
});

// ── Patterns ──────────────────────────────────────────────────────────────────

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const PHONE_RE = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.\-]?)?\d{3}[\s.\-]?\d{4}/g;

// Common junk emails to filter out
const EMAIL_BLOCKLIST = [
  'example.com', 'domain.com', 'email.com', 'youremail.com',
  'yoursite.com', 'sentry.io', 'wixpress.com', 'squarespace.com',
  'wordpress.com', 'google.com', 'facebook.com', 'twitter.com',
  'schema.org', 'w3.org', 'openssl.org', 'png', 'jpg', 'gif',
  'jpeg', 'webp', 'svg', 'css', 'js'
];

// ── Page scanner ──────────────────────────────────────────────────────────────

function scanPage() {
  const pageText = getPageText();
  const pageHtml = document.documentElement.innerHTML;

  // Emails from text + mailto: links
  const emailSet = new Set();

  // From visible text
  const textEmails = pageText.match(EMAIL_RE) || [];
  textEmails.forEach(e => emailSet.add(e.toLowerCase()));

  // From href="mailto:..." links
  document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
    const raw = a.href.replace('mailto:', '').split('?')[0].trim();
    if (raw) emailSet.add(raw.toLowerCase());
  });

  // Filter junk
  const emails = [...emailSet].filter(e => {
    const domain = e.split('@')[1] || '';
    return !EMAIL_BLOCKLIST.some(b => domain.includes(b));
  }).slice(0, 50);

  // Phones from text
  const phoneSet = new Set();
  const rawPhones = pageText.match(PHONE_RE) || [];
  rawPhones.forEach(p => {
    const clean = p.replace(/\D/g, '');
    if (clean.length >= 10 && clean.length <= 11) {
      phoneSet.add(formatPhone(p.trim()));
    }
  });

  // Also from tel: links
  document.querySelectorAll('a[href^="tel:"]').forEach(a => {
    const raw = a.href.replace('tel:', '').trim();
    if (raw) phoneSet.add(raw);
  });

  const phones = [...phoneSet].slice(0, 20);

  // Site info
  const domain = window.location.hostname.replace('www.', '');
  const title  = document.title || domain;

  return { emails, phones, domain, title, url: window.location.href };
}

// ── Deep scanner (Pro) — checks /contact and /about pages ────────────────────

async function scanDeep() {
  // Start with current page
  const base = scanPage();
  const emailSet = new Set(base.emails);
  const phoneSet = new Set(base.phones);

  // Find internal contact/about links
  const origin = window.location.origin;
  const subpageLinks = new Set();

  document.querySelectorAll('a[href]').forEach(a => {
    const href = a.href;
    if (!href.startsWith(origin)) return;
    const path = href.replace(origin, '').toLowerCase();
    if (/contact|about|team|reach|hello|support|info/.test(path)) {
      subpageLinks.add(href.split('#')[0]);
    }
  });

  // Fetch up to 3 subpages
  const toFetch = [...subpageLinks].slice(0, 3);

  for (const url of toFetch) {
    try {
      const res  = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const html = await res.text();
      const parser = new DOMParser();
      const doc  = parser.parseFromString(html, 'text/html');
      const text = doc.body?.innerText || doc.body?.textContent || '';

      // Emails from fetched page text
      const emails = text.match(EMAIL_RE) || [];
      emails.forEach(e => {
        const lower = e.toLowerCase();
        const domain = lower.split('@')[1] || '';
        if (!EMAIL_BLOCKLIST.some(b => domain.includes(b))) {
          emailSet.add(lower);
        }
      });

      // Emails from mailto links
      doc.querySelectorAll('a[href^="mailto:"]').forEach(a => {
        const raw = a.href.replace('mailto:', '').split('?')[0].trim();
        if (raw) emailSet.add(raw.toLowerCase());
      });

      // Phones
      const phones = text.match(PHONE_RE) || [];
      phones.forEach(p => {
        const clean = p.replace(/\D/g, '');
        if (clean.length >= 10 && clean.length <= 11) {
          phoneSet.add(formatPhone(p.trim()));
        }
      });

      // Tel links
      doc.querySelectorAll('a[href^="tel:"]').forEach(a => {
        const raw = a.href.replace('tel:', '').trim();
        if (raw) phoneSet.add(raw);
      });

    } catch (_) { /* skip failed fetches */ }
  }

  return {
    emails: [...emailSet].slice(0, 50),
    phones: [...phoneSet].slice(0, 20),
    domain: base.domain,
    title:  base.title,
    url:    base.url,
    deepScanned: toFetch.length
  };
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function getPageText() {
  // Use innerText for visible text (better than textContent)
  return document.body?.innerText || document.body?.textContent || '';
}

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  }
  return raw;
}
