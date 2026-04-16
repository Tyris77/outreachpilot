/**
 * OutreachPilot — popup.js
 */

const els = {
  badgePro:       document.getElementById('badgePro'),
  badgeFree:      document.getElementById('badgeFree'),
  statusBanner:   document.getElementById('statusBanner'),
  statusText:     document.getElementById('statusText'),
  usageSection:   document.getElementById('usageSection'),
  usageCount:     document.getElementById('usageCount'),
  usageBar:       document.getElementById('usageBar'),
  actionsSection: document.getElementById('actionsSection'),
  btnScan:        document.getElementById('btnScan'),
  btnDeepScan:    document.getElementById('btnDeepScan'),
  progressSection:document.getElementById('progressSection'),
  progressText:   document.getElementById('progressText'),
  resultsSection: document.getElementById('resultsSection'),
  siteInfo:       document.getElementById('siteInfo'),
  emailsBlock:    document.getElementById('emailsBlock'),
  emailsList:     document.getElementById('emailsList'),
  phonesBlock:    document.getElementById('phonesBlock'),
  phonesList:     document.getElementById('phonesList'),
  noResults:      document.getElementById('noResults'),
  btnCopyEmails:  document.getElementById('btnCopyEmails'),
  btnCopyPhones:  document.getElementById('btnCopyPhones'),
  btnCopyAll:     document.getElementById('btnCopyAll'),
  upgradeSection: document.getElementById('upgradeSection'),
  licenseInput:   document.getElementById('licenseInput'),
  btnActivate:    document.getElementById('btnActivate'),
  licenseMsg:     document.getElementById('licenseMsg'),
  proSection:     document.getElementById('proSection'),
  proKeyDisplay:  document.getElementById('proKeyDisplay'),
  btnDeactivate:  document.getElementById('btnDeactivate'),
};

let state = { isPro: false, usedToday: 0, remaining: 10, dailyLimit: 10, results: null };

(async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const blocked = !tab || /^chrome:|^chrome-extension:|chrome\.google\.com\/webstore/.test(tab.url || '');

  const status = await sendToSW({ type: 'OP_GET_STATUS' });
  if (status) Object.assign(state, status);

  renderHeader();
  renderUsage();
  renderUpgrade();

  if (blocked) {
    setStatus('error', '⚠ Cannot scan Chrome system pages');
    els.actionsSection.style.display = '';
    els.btnScan.disabled = true;
    els.btnDeepScan.disabled = true;
  } else {
    setStatus('ready', `✓ Ready to scan — ${tab.hostname || new URL(tab.url).hostname}`);
    els.actionsSection.style.display = '';
    els.btnScan.disabled = !state.isPro && state.remaining <= 0;
    if (state.isPro) {
      els.btnDeepScan.disabled = false;
      els.btnDeepScan.classList.add('is-pro');
    }
  }

  wireEvents(tab);
})();

function renderHeader() {
  els.badgePro.style.display  = state.isPro ? '' : 'none';
  els.badgeFree.style.display = state.isPro ? 'none' : '';
}

function renderUsage() {
  if (state.isPro) { els.usageSection.style.display = 'none'; return; }
  els.usageSection.style.display = '';
  els.usageCount.textContent = `${state.usedToday} / ${state.dailyLimit}`;
  const pct = Math.min(100, (state.usedToday / state.dailyLimit) * 100);
  els.usageBar.style.width = pct + '%';
  if (pct >= 100) els.usageBar.style.background = '#ef4444';
}

function renderUpgrade() {
  els.upgradeSection.style.display = state.isPro ? 'none' : '';
  els.proSection.style.display = state.isPro ? '' : 'none';
  if (state.isPro && state.licenseKey) els.proKeyDisplay.textContent = state.licenseKey;
}

function renderResults(data) {
  state.results = data;
  els.resultsSection.style.display = '';
  els.siteInfo.textContent = `${data.domain} — ${data.title}`;

  const hasEmails = data.emails.length > 0;
  const hasPhones = data.phones.length > 0;

  els.emailsBlock.style.display = hasEmails ? '' : 'none';
  els.phonesBlock.style.display = hasPhones ? '' : 'none';
  els.noResults.style.display   = (!hasEmails && !hasPhones) ? '' : 'none';
  els.btnCopyAll.style.display  = (hasEmails || hasPhones) ? '' : 'none';

  // Render emails
  els.emailsList.innerHTML = '';
  data.emails.forEach(email => {
    els.emailsList.appendChild(makeContactRow(email));
  });

  // Render phones
  els.phonesList.innerHTML = '';
  data.phones.forEach(phone => {
    els.phonesList.appendChild(makeContactRow(phone));
  });
}

function makeContactRow(value) {
  const row = document.createElement('div');
  row.className = 'op-contact-item';

  const val = document.createElement('div');
  val.className = 'op-contact-value';
  val.textContent = value;
  val.title = value;

  const btn = document.createElement('button');
  btn.className = 'op-copy-btn';
  btn.textContent = 'Copy';
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(value).then(() => {
      btn.textContent = '✓';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
    });
  });

  row.appendChild(val);
  row.appendChild(btn);
  return row;
}

function wireEvents(tab) {
  els.btnScan.addEventListener('click', () => runScan(tab, false));
  els.btnDeepScan.addEventListener('click', () => { if (state.isPro) runScan(tab, true); });

  els.btnCopyEmails.addEventListener('click', () => {
    if (!state.results?.emails.length) return;
    copyAndFlash(state.results.emails.join('\n'), els.btnCopyEmails);
  });

  els.btnCopyPhones.addEventListener('click', () => {
    if (!state.results?.phones.length) return;
    copyAndFlash(state.results.phones.join('\n'), els.btnCopyPhones);
  });

  els.btnCopyAll.addEventListener('click', () => {
    if (!state.results) return;
    const lines = [];
    if (state.results.emails.length) lines.push('EMAILS:', ...state.results.emails, '');
    if (state.results.phones.length) lines.push('PHONES:', ...state.results.phones);
    copyAndFlash(lines.join('\n'), els.btnCopyAll);
  });

  els.btnActivate.addEventListener('click', activateLicense);
  els.licenseInput.addEventListener('keydown', e => { if (e.key === 'Enter') activateLicense(); });
  els.btnDeactivate.addEventListener('click', deactivateLicense);
}

async function runScan(tab, deep) {
  if (!tab) return;
  if (!state.isPro && state.remaining <= 0) {
    setStatus('error', '⚠ Daily limit reached. Upgrade to Pro.');
    return;
  }

  els.actionsSection.style.display = 'none';
  els.resultsSection.style.display = 'none';
  els.progressSection.style.display = '';
  els.progressText.textContent = deep ? 'Deep scanning contact & about pages…' : 'Scanning page…';

  try {
    const msgType = deep ? 'OP_SCAN_DEEP' : 'OP_SCAN_PAGE';
    const response = await chrome.tabs.sendMessage(tab.id, { type: msgType });

    if (!response?.ok) throw new Error(response?.error || 'Scan failed.');

    if (!state.isPro) {
      await sendToSW({ type: 'OP_INCREMENT', count: 1 });
      state.usedToday++;
      state.remaining = Math.max(0, state.dailyLimit - state.usedToday);
    }

    els.progressSection.style.display = 'none';
    els.actionsSection.style.display = '';
    renderUsage();
    renderResults(response);

    const total = response.emails.length + response.phones.length;
    setStatus('ready', `✓ Found ${total} contact${total !== 1 ? 's' : ''} on ${response.domain}`);

  } catch (err) {
    els.progressSection.style.display = 'none';
    els.actionsSection.style.display = '';
    setStatus('error', `⚠ ${err.message}`);
  }
}

async function activateLicense() {
  const key = els.licenseInput.value.trim();
  if (!key) return;
  els.btnActivate.disabled = true;
  els.btnActivate.textContent = '…';
  const result = await sendToSW({ type: 'OP_ACTIVATE_LICENSE', key });
  els.btnActivate.disabled = false;
  els.btnActivate.textContent = 'Activate';
  if (result?.ok) {
    showLicenseMsg('ok', `✓ Pro activated!`);
    state.isPro = true; state.licenseKey = result.key; state.remaining = Infinity;
    setTimeout(() => { renderHeader(); renderUsage(); renderUpgrade(); els.btnDeepScan.disabled = false; els.btnDeepScan.classList.add('is-pro'); els.btnScan.disabled = false; }, 1200);
  } else {
    showLicenseMsg('error', result?.error || 'Invalid key.');
  }
}

async function deactivateLicense() {
  await sendToSW({ type: 'OP_REMOVE_LICENSE' });
  state.isPro = false; state.licenseKey = null;
  state.remaining = Math.max(0, state.dailyLimit - state.usedToday);
  renderHeader(); renderUsage(); renderUpgrade();
}

function setStatus(type, text) {
  els.statusBanner.className = `op-status op-status--${type}`;
  els.statusText.textContent = text;
}

function showLicenseMsg(type, text) {
  els.licenseMsg.style.display = '';
  els.licenseMsg.className = `op-license-msg op-license-msg--${type}`;
  els.licenseMsg.textContent = text;
}

function copyAndFlash(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = btn === els.btnCopyAll ? '⧉ Copy Everything' : 'Copy All'; btn.classList.remove('copied'); }, 1500);
  });
}

async function sendToSW(msg) {
  try { return await chrome.runtime.sendMessage(msg); }
  catch (e) { return null; }
}
