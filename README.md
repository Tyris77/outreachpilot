# OutreachPilot — Email & Contact Finder

> Find emails and phone numbers on any website in one click. Built for sales reps, recruiters, and outreach pros.

[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-Available-4285F4?logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore)
[![License](https://img.shields.io/badge/License-MIT-indigo)](LICENSE)

---

## What It Does

OutreachPilot scans any website and extracts publicly visible contact information:

- **Email addresses** — found in page text, mailto: links, and obfuscated formats
- **Phone numbers** — US/international formats, auto-formatted to (XXX) XXX-XXXX
- **Deep Scan (Pro)** — automatically fetches /contact, /about, /team pages to find more contacts

All processing happens in your browser. Nothing is sent to any server.

---

## Features

| Feature | Free | Pro |
|---|---|---|
| Scan current page for emails & phones | ✓ (10/day) | ✓ Unlimited |
| One-click copy individual contacts | ✓ | ✓ |
| Copy all emails / all phones at once | ✓ | ✓ |
| Deep Scan (contact + about + team pages) | — | ✓ |
| Works on any website | ✓ | ✓ |

---

## Installation

1. Download from the [Chrome Web Store](https://chrome.google.com/webstore)
2. Pin the extension to your toolbar
3. Navigate to any website and click the OutreachPilot icon
4. Hit **Find Emails & Phones**

---

## Pro Plan

**$9/month** — Unlimited scans + Deep Scan across contact, about, and team pages.

[Upgrade to Pro →](https://gumroad.com/l/outreachpilot)

After purchase, you'll receive a license key in format `OP-XXXX-XXXX-XXXX`. Enter it in the extension popup to activate.

---

## Privacy

- **No data leaves your browser.** Zero external servers.
- Usage count and license key stored locally via `chrome.storage.local`
- No analytics, no tracking, no accounts required

[Full Privacy Policy](https://tyris77.github.io/outreachpilot/privacy.html)

---

## Tech Stack

- Manifest V3
- Content Scripts (regex extraction from DOM + fetch for Deep Scan)
- Service Worker (storage, license validation)
- Zero dependencies

---

## Part of the Pilot Suite

| Extension | Purpose |
|---|---|
| [PagePilot Capture](https://tyris77.github.io/pagepilot-capture/) | Screenshot & PDF any webpage |
| [LeadPilot](https://tyris77.github.io/leadpilot/) | Google Maps lead scraper → CSV |
| **OutreachPilot** | Email & phone finder on any site |

---

## Contact

Questions? Reach out at [tyris77@gmail.com](mailto:tyris77@gmail.com)
