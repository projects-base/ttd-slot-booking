/* ================================================================
   TTD Seva Booking Bot — sidepanel.js
   Supports: Arjitha Seva + Special Entry Darshan + Angapradakshinam modes
   ================================================================ */

const STORAGE_KEY = 'ttd_bot_v2';
const MASTER_KEY = 'ttd_master_pilgrims';

// Spelled the way the TTD portal spells it: "Angapradakshinam" (…kshi…).
// Configs saved before this fix used 'angapradakshanam' — see normalizeBookingMode().
const MODE_ANGAPRADAKSHINAM = 'angapradakshinam';

let currentMode = 'arjitha_seva'; // 'arjitha_seva' | 'special_entry' | 'angapradakshinam'
let masterPilgrims = [];

function normalizeBookingMode(mode) {
  const m = String(mode || '').toLowerCase().replace(/[\s._-]/g, '');
  if (m.startsWith('angapradaksh')) return MODE_ANGAPRADAKSHINAM;
  if (m === 'specialentry') return 'special_entry';
  return mode || 'arjitha_seva';
}

// ── SECTION TOGGLE (via event delegation — inline onclick blocked by CSP) ──
function toggleSection(id) {
  const sec = document.getElementById(id);
  if (sec) sec.classList.toggle('open');
}

// Wire up all section headers once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-section]').forEach(header => {
    header.addEventListener('click', () => toggleSection(header.dataset.section));
  });
  
  // ── FIREBASE AUTH ───────────────────────────────────────────
  if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
    const auth = firebase.auth();
    
    auth.onAuthStateChanged(user => {
      const overlay = document.getElementById('loginOverlay');
      const appContent = document.getElementById('appContent');
      if (user) {
        overlay.classList.add('hidden');
        appContent.style.display = 'flex';
      } else {
        overlay.classList.remove('hidden');
        appContent.style.display = 'none';
      }
    });

    document.getElementById('doLoginBtn').addEventListener('click', async () => {
      const email = document.getElementById('loginEmail').value;
      const pwd = document.getElementById('loginPassword').value;
      const errorEl = document.getElementById('loginError');
      const btn = document.getElementById('doLoginBtn');
      
      errorEl.style.display = 'none';
      btn.textContent = 'Logging in...';
      
      try {
        await auth.signInWithEmailAndPassword(email, pwd);
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      } finally {
        btn.textContent = 'Log In';
      }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
      auth.signOut();
    });
  } else {
    console.warn("Firebase SDK or Config not loaded.");
    // Fallback if config is missing during dev (optional: uncomment to force login overlay block)
    // document.getElementById('appContent').style.display = 'flex'; 
    // document.getElementById('loginOverlay').classList.add('hidden');
  }
});

// ── BOOKING MODE TOGGLE ───────────────────────────────────────
function setBookingMode(mode) {
  currentMode = normalizeBookingMode(mode);
  mode = currentMode;

  // Update toggle buttons
  document.getElementById('modeArjitha').classList.toggle('active', mode === 'arjitha_seva');
  document.getElementById('modeSpecial').classList.toggle('active', mode === 'special_entry');
  document.getElementById('modeAngapradakshinam').classList.toggle('active', mode === MODE_ANGAPRADAKSHINAM);

  // Update header subtitle
  let subtitle = 'Arjitha Seva Booking';
  if (mode === 'special_entry') subtitle = 'Special Entry Booking';
  else if (mode === MODE_ANGAPRADAKSHINAM) subtitle = 'Angapradakshinam Booking';
  document.getElementById('headerSub').textContent = subtitle;

  // Toggle info banner text dynamically
  const infoEl = document.getElementById('specialInfo');
  if (infoEl) {
    if (mode === 'special_entry') {
      infoEl.textContent = '🕉️ Special Entry Darshan — no temple/seva selection needed. Pick your date and time slots.';
    } else if (mode === MODE_ANGAPRADAKSHINAM) {
      infoEl.textContent = '🕉️ Angapradakshinam — no temple/seva selection needed. Pick your date and time slots.';
    }
  }

  // Toggle field visibility
  document.querySelectorAll('.mode-arjitha-only').forEach(el => {
    el.classList.toggle('hidden', mode !== 'arjitha_seva');
  });
  document.querySelectorAll('.mode-special-only').forEach(el => {
    el.classList.toggle('hidden', mode !== 'special_entry' && mode !== MODE_ANGAPRADAKSHINAM);
  });
}

// Wire up mode toggle buttons
document.getElementById('modeArjitha').addEventListener('click', () => setBookingMode('arjitha_seva'));
document.getElementById('modeSpecial').addEventListener('click', () => setBookingMode('special_entry'));
document.getElementById('modeAngapradakshinam').addEventListener('click', () => setBookingMode(MODE_ANGAPRADAKSHINAM));

// ── PILGRIM RENDERING ─────────────────────────────────────────
function renderPilgrims(pilgrims) {
  const c = document.getElementById('pilgrimsContainer');
  c.innerHTML = '';
  pilgrims.forEach((p, i) => {
    const d = document.createElement('div');
    d.className = 'pilgrim-block';
    d.innerHTML = `
      <div class="pilgrim-header">
        <span class="pilgrim-label">🙏 Pilgrim ${i + 1}</span>
        ${i > 0 ? `<button class="remove-btn" data-idx="${i}">✕ Remove</button>` : ''}
      </div>
      <div class="field">
        <label>Full Name</label>
        <input type="text" data-field="name" data-idx="${i}" value="${p.name || ''}" placeholder="Full Name">
      </div>
      <div class="row-2">
        <div class="field">
          <label>Age</label>
          <input type="number" data-field="age" data-idx="${i}" value="${p.age || ''}" placeholder="Age" min="1" max="120">
        </div>
        <div class="field">
          <label>Gender</label>
          <select data-field="gender" data-idx="${i}">
            <option value="Male"        ${p.gender === 'Male'        ? 'selected' : ''}>Male</option>
            <option value="Female"      ${p.gender === 'Female'      ? 'selected' : ''}>Female</option>
            <option value="Transgender" ${p.gender === 'Transgender' ? 'selected' : ''}>Transgender</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>Photo ID Proof</label>
        <select data-field="idType" data-idx="${i}">
          <option value="Aadhaar Card" ${p.idType === 'Aadhaar Card' ? 'selected' : ''}>Aadhaar Card</option>
          <option value="Passport"     ${p.idType === 'Passport'     ? 'selected' : ''}>Passport</option>
        </select>
      </div>
      <div class="field">
        <label>ID Number</label>
        <input type="text" data-field="idNumber" data-idx="${i}" value="${p.idNumber || ''}" placeholder="ID Number">
      </div>
    `;
    c.appendChild(d);
  });
}

function collectPilgrims() {
  const pilgrims = [];
  document.querySelectorAll('.pilgrim-block').forEach(() => pilgrims.push({}));
  document.querySelectorAll('[data-field]').forEach(el => {
    const idx = parseInt(el.dataset.idx);
    if (!pilgrims[idx]) pilgrims[idx] = {};
    pilgrims[idx][el.dataset.field] = el.value;
  });
  return pilgrims;
}

// ── CONFIG GET / SET ──────────────────────────────────────────
// Helper: get the visible text of the currently selected option
function selectedText(id) {
  const sel = document.getElementById(id);
  const idx = sel.selectedIndex;
  if (idx < 0) return '';
  // The "-- Select Temple --" placeholder carries an empty value while real
  // options use value === text. Returning its label would make content.js treat
  // it as a real choice and hunt the portal for a temple by that name.
  if (!sel.options[idx].value) return '';
  return sel.options[idx].text.trim();
}

// Helper: select an option by matching its visible text (value === text, so sel.value works)
function selectByText(id, text) {
  const sel = document.getElementById(id);
  for (const opt of sel.options) {
    if (opt.text.trim() === text.trim()) {
      sel.value = opt.value;  // value === text, so this reliably sets selection
      return;
    }
  }
}

// ── DATE VALIDATION ───────────────────────────────────────────
//
// Dates are entered free-form as DD-MM-YYYY, one per line. Previously anything
// that failed the format regex was silently dropped, so a typo meant the bot
// quietly skipped that date, and past dates were accepted outright — the bot
// would then hunt forever for a day the portal's calendar will never offer.
//
// Returns { dates, errors } so callers can either use the good dates or report
// the bad ones line by line.

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Parses DD-MM-YYYY strictly: rejects impossible days like 31-02-2026, which
// `new Date()` would happily roll over into March.
function parseDMY(text) {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(text);
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);

  const d = new Date(year, month - 1, day);
  if (d.getDate() !== day || d.getMonth() !== month - 1 || d.getFullYear() !== year) {
    return null; // e.g. 31-02-2026 or 00-01-2026
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

function validatePreferredDates(raw) {
  const today = startOfToday();
  const dates = [];
  const errors = [];
  const seen = new Set();

  raw.split('\n').forEach((line, i) => {
    const text = line.trim();
    if (!text) return; // blank lines are not an error

    const lineNo = i + 1;
    const parsed = parseDMY(text);

    if (!parsed) {
      errors.push(`Line ${lineNo}: "${text}" is not a valid DD-MM-YYYY date`);
      return;
    }
    if (parsed < today) {
      errors.push(`Line ${lineNo}: ${text} is in the past`);
      return;
    }
    if (seen.has(text)) {
      errors.push(`Line ${lineNo}: ${text} is a duplicate`);
      return;
    }

    seen.add(text);
    dates.push(text);
  });

  return { dates, errors };
}

// Paints the inline error under the Preferred Dates field. Called on every
// keystroke so problems surface while typing, not only on Start.
function refreshDateValidationUI() {
  const field = document.getElementById('preferredDates');
  const errorEl = document.getElementById('datesError');
  if (!field || !errorEl) return [];

  const { errors } = validatePreferredDates(field.value);

  if (errors.length) {
    field.classList.add('invalid');
    errorEl.textContent = errors.join(' · ');
    errorEl.style.display = 'block';
  } else {
    field.classList.remove('invalid');
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }

  return errors;
}

// Full snapshot of the form, for persistence. Every field is captured
// regardless of the active mode so switching modes never discards what you
// typed in the other one. getBotConfig() narrows this for the bot.
function getConfig() {
  const cfg = {
    bookingMode:    currentMode,
    mobile:         document.getElementById('mobile').value.trim(),
    targetTime:     document.getElementById('targetTime').value.trim(),
    preferredDates: validatePreferredDates(document.getElementById('preferredDates').value).dates,
    // Kept verbatim so an in-progress line with a typo is not thrown away
    // when the panel closes mid-edit.
    preferredDatesRaw: document.getElementById('preferredDates').value,
    general: {
      gothram:  document.getElementById('gothram').value.trim(),
      email:    document.getElementById('email').value.trim(),
      city:     document.getElementById('city').value.trim(),
      state:    document.getElementById('state').value.trim(),
      country:  document.getElementById('country').value.trim(),
      pincode:  document.getElementById('pincode').value.trim(),
    },
    pilgrims: collectPilgrims(),
    sevaName: selectedText('sevaName'),
    templeName: selectedText('templeName'),
    preferredSlots: document.getElementById('preferredSlots').value
      .split('\n').map(s => s.trim()).filter(s => s.length > 0),
  };

  cfg.ticketCount = document.getElementById('ticketCount').value.trim() || '01';

  return cfg;
}

// The config handed to content.js. Blanks the fields that do not apply to the
// active mode — clickSevaAtTime() keys off sevaName being empty to fall back to
// the generic "Book Now" link, so a stale seva name would misfire there.
function getBotConfig() {
  const cfg = getConfig();
  delete cfg.preferredDatesRaw;

  if (cfg.bookingMode === 'arjitha_seva') {
    delete cfg.preferredSlots;
  } else {
    cfg.sevaName = '';
    cfg.templeName = '';
  }

  return cfg;
}

// ── PERSISTENCE ───────────────────────────────────────────────
//
// The config used to be written only inside the Start Bot handler, and only
// after validation passed. Anything typed and not started was lost, so the
// panel always reopened showing the snapshot from the last successful Start —
// for most runs, whatever was entered on first install.
//
// Now every edit is saved (debounced), plus an immediate flush when the panel
// is hidden or torn down.

let initialLoadDone = false;
let saveTimer = null;

function saveConfigNow() {
  // Never persist before the stored config has been read back into the form,
  // or an empty form would overwrite good data on startup.
  if (!initialLoadDone) return;
  chrome.storage.local.set({ [STORAGE_KEY]: getConfig() });
}

function scheduleSave() {
  if (!initialLoadDone) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveConfigNow, 400);
}

function loadConfig(cfg) {
  // Restore booking mode first
  if (cfg.bookingMode) {
    setBookingMode(cfg.bookingMode);
  }

  document.getElementById('mobile').value         = cfg.mobile        || '';
  document.getElementById('ticketCount').value    = cfg.ticketCount   || '01';
  document.getElementById('targetTime').value     = cfg.targetTime    || '10:00:00';
  // Prefer the raw text so a half-typed line survives a panel close; fall back
  // to the validated list for configs saved before preferredDatesRaw existed.
  document.getElementById('preferredDates').value = cfg.preferredDatesRaw
    ?? (cfg.preferredDates || []).join('\n');
  document.getElementById('gothram').value        = cfg.general?.gothram  || '';
  document.getElementById('email').value          = cfg.general?.email    || '';
  document.getElementById('city').value           = cfg.general?.city     || '';
  document.getElementById('state').value          = cfg.general?.state    || '';
  document.getElementById('country').value        = cfg.general?.country  || 'India';
  document.getElementById('pincode').value        = cfg.general?.pincode  || '';

  // Restore temple + seva selections by matching visible text
  if (cfg.templeName) {
    selectByText('templeName', cfg.templeName);
    populateSevas(cfg.templeName);
    if (cfg.sevaName) selectByText('sevaName', cfg.sevaName);
  }

  // Restore Special Entry slots
  if (cfg.preferredSlots) {
    document.getElementById('preferredSlots').value = (cfg.preferredSlots || []).join('\n');
  }

  renderPilgrims(
    cfg.pilgrims?.length
      ? cfg.pilgrims
      : [{ name: '', age: '', gender: 'Male', idType: 'Aadhaar Card', idNumber: '' }]
  );

  // Flag any dates that have gone stale since the config was saved — a run
  // configured last week will have dates that are now in the past.
  refreshDateValidationUI();

  // Only now is it safe to start persisting edits.
  initialLoadDone = true;
}

// ── TEMPLE / SEVA DROPDOWNS ───────────────────────────────────
function populateTemples() {
  const sel = document.getElementById('templeName');
  sel.innerHTML = '<option value="">-- Select Temple --</option>';
  Object.keys(TTD_TEMPLE_SEVA_MAP).forEach(temple => {
    const opt = document.createElement('option');
    opt.value       = temple;   // value === text so sel.value = text works
    opt.textContent = temple;
    sel.appendChild(opt);
  });
}

function populateSevas(templeName) {
  const sel = document.getElementById('sevaName');
  sel.innerHTML = '<option value="">-- Select Seva --</option>';
  (TTD_TEMPLE_SEVA_MAP[templeName] || []).forEach(seva => {
    const opt = document.createElement('option');
    opt.value       = seva;     // value === text
    opt.textContent = seva;
    sel.appendChild(opt);
  });
}


// ── STATUS UI ─────────────────────────────────────────────────
function setStatus(msg, type = '') {
  const bar  = document.getElementById('statusBar');
  const text = document.getElementById('statusText');
  text.textContent = msg;
  bar.className = 'status-bar ' + type;
}

// ── INIT ──────────────────────────────────────────────────────
populateTemples();
chrome.storage.local.get(STORAGE_KEY, d => loadConfig(d[STORAGE_KEY] || {}));
loadMasterPilgrims();

// ── AUTOSAVE WIRING ───────────────────────────────────────────
//
// Delegated from the document so pilgrim rows added after load are covered too
// — they are re-created by renderPilgrims() and would otherwise need rebinding.
document.addEventListener('input', e => {
  if (e.target.id === 'preferredDates') refreshDateValidationUI();
  scheduleSave();
});
document.addEventListener('change', scheduleSave);

// A side panel is torn down without warning when closed. visibilitychange and
// pagehide both fire reliably in extension pages, where beforeunload does not,
// so flush synchronously on either rather than waiting out the debounce.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    clearTimeout(saveTimer);
    saveConfigNow();
  }
});
window.addEventListener('pagehide', () => {
  clearTimeout(saveTimer);
  saveConfigNow();
});

// Set version badge dynamically from manifest
try {
  const version = chrome.runtime.getManifest().version;
  document.getElementById('versionBadge').textContent = `v${version}`;
} catch (e) {
  console.error('Could not load version from manifest:', e);
}

document.getElementById('templeName').addEventListener('change', e => {
  const tSel = e.target;
  const templeName = tSel.options[tSel.selectedIndex].text.trim();
  populateSevas(templeName);
});

// ── PILGRIM ADD / REMOVE ──────────────────────────────────────
document.getElementById('addPilgrim').addEventListener('click', () => {
  const p = collectPilgrims();
  p.push({ name: '', age: '', gender: 'Male', idType: 'Aadhaar Card', idNumber: '' });
  renderPilgrims(p);
});

document.getElementById('pilgrimsContainer').addEventListener('click', e => {
  if (e.target.classList.contains('remove-btn')) {
    const idx = parseInt(e.target.dataset.idx);
    const p   = collectPilgrims();
    p.splice(idx, 1);
    renderPilgrims(p.length ? p : [{ name: '', age: '', gender: 'Male', idType: 'Aadhaar Card', idNumber: '' }]);
  }
});

// ── START BOT ─────────────────────────────────────────────────
document.getElementById('startBtn').addEventListener('click', () => {
  const cfg = getBotConfig();

  // Common validation
  if (!cfg.mobile || cfg.mobile.length !== 10) {
    setStatus('❌ Enter a valid 10-digit mobile number', 'error'); return;
  }

  // Reject bad dates loudly rather than quietly booking only the good ones —
  // starting a timed run with a silently dropped date is worse than not starting.
  const dateErrors = refreshDateValidationUI();
  if (dateErrors.length) {
    setStatus(`❌ Fix the dates first — ${dateErrors[0]}`, 'error'); return;
  }
  if (!cfg.preferredDates.length) {
    setStatus('❌ Add at least one future date in DD-MM-YYYY format', 'error'); return;
  }
  if (!cfg.pilgrims.length || !cfg.pilgrims[0].name) {
    setStatus('❌ Add at least one pilgrim with a name', 'error'); return;
  }
  if (!cfg.general.gothram || !cfg.general.email) {
    setStatus('❌ Fill in Gothram and Email fields', 'error'); return;
  }

  // Mode-specific validation
  if (cfg.bookingMode === 'arjitha_seva') {
    // Arjitha Seva needs temple & seva selected (already optional in original, kept for safety)
  } else if (cfg.bookingMode === 'special_entry' || cfg.bookingMode === MODE_ANGAPRADAKSHINAM) {
    if (!cfg.preferredSlots || !cfg.preferredSlots.length) {
      setStatus('❌ Add at least one preferred time slot (e.g. 10 AM)', 'error'); return;
    }
  }

  // Persist the full snapshot, not the narrowed bot config — otherwise starting
  // in Special Entry mode would wipe the saved temple/seva selection.
  saveConfigNow();

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) { setStatus('❌ No active tab found', 'error'); return; }
    chrome.tabs.sendMessage(tabs[0].id, { action: 'START_BOT', config: cfg }, resp => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, files: ['data.js', 'content.js'] }, () => {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'START_BOT', config: cfg });
        });
      }
    });
  });

  document.getElementById('startBtn').style.display = 'none';
  document.getElementById('stopBtn').style.display  = 'block';
  
  let modeLabel = 'Arjitha Seva';
  if (cfg.bookingMode === 'special_entry') modeLabel = 'Special Entry';
  else if (cfg.bookingMode === MODE_ANGAPRADAKSHINAM) modeLabel = 'Angapradakshinam';
  
  setStatus(`🟡 Bot started (${modeLabel}) — watching page...`, 'running');
});

// ── STOP BOT ──────────────────────────────────────────────────
document.getElementById('stopBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: 'STOP_BOT' });
  });
  document.getElementById('startBtn').style.display = 'block';
  document.getElementById('stopBtn').style.display  = 'none';
  setStatus('⛔ Bot stopped');
});

// ── STATUS LISTENER from content.js ──────────────────────────
chrome.runtime.onMessage.addListener(msg => {
  if (msg.action === 'STATUS_UPDATE') {
    setStatus(msg.message, msg.type || 'running');
    if (msg.done) {
      document.getElementById('startBtn').style.display = 'block';
      document.getElementById('stopBtn').style.display  = 'none';
    }
  }
});

// ── PILGRIM MASTER LIST ───────────────────────────────────────

function loadMasterPilgrims() {
  chrome.storage.local.get(MASTER_KEY, d => {
    masterPilgrims = d[MASTER_KEY] || [];
    renderMasterPilgrims();
  });
}

function saveMasterPilgrims() {
  chrome.storage.local.set({ [MASTER_KEY]: masterPilgrims }, () => {
    renderMasterPilgrims();
  });
}

function renderMasterPilgrims() {
  const container = document.getElementById('masterListContainer');
  container.innerHTML = '';
  if (masterPilgrims.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--muted); font-size: 11px; padding: 10px 0;">No saved pilgrims found</div>`;
    return;
  }

  masterPilgrims.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = 'master-pilgrim-card';
    card.innerHTML = `
      <div class="master-pilgrim-info">
        <span class="master-pilgrim-name">${p.name} (${p.age}, ${p.gender})</span>
        <span class="master-pilgrim-sub">${p.idType}: ${p.idNumber}</span>
      </div>
      <div class="master-pilgrim-actions">
        <button class="master-action-btn" data-action="add-to-booking" data-idx="${idx}">➕ Add</button>
        <button class="master-delete-btn" data-action="delete" data-idx="${idx}">✕</button>
      </div>
    `;
    container.appendChild(card);
  });
}

document.getElementById('saveActiveToMaster').addEventListener('click', () => {
  const activePilgrims = collectPilgrims();
  let addedCount = 0;
  
  activePilgrims.forEach(p => {
    if (!p.name || !p.idNumber) return; // Must have name and ID number
    
    // Check for duplicates
    const exists = masterPilgrims.some(mp => mp.idNumber.trim().toLowerCase() === p.idNumber.trim().toLowerCase());
    if (!exists) {
      masterPilgrims.push({
        name: p.name.trim(),
        age: p.age,
        gender: p.gender,
        idType: p.idType,
        idNumber: p.idNumber.trim()
      });
      addedCount++;
    }
  });

  if (addedCount > 0) {
    saveMasterPilgrims();
    setStatus(`✅ Added ${addedCount} pilgrims to Master List`, 'running');
  } else {
    setStatus('⚠️ No new pilgrim details to save (or duplicates ignored)', 'error');
  }
});

document.getElementById('masterListContainer').addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  
  const action = btn.dataset.action;
  const idx = parseInt(btn.dataset.idx, 10);
  
  if (action === 'delete') {
    masterPilgrims.splice(idx, 1);
    saveMasterPilgrims();
    setStatus('🗑️ Removed pilgrim from Master List', 'running');
  } else if (action === 'add-to-booking') {
    const selected = masterPilgrims[idx];
    if (!selected) return;
    
    const active = collectPilgrims();
    if (active.length === 1 && !active[0].name && !active[0].idNumber) {
      active[0] = { ...selected };
    } else {
      const alreadyAdded = active.some(ap => ap.idNumber.trim().toLowerCase() === selected.idNumber.trim().toLowerCase());
      if (alreadyAdded) {
        setStatus(`⚠️ ${selected.name} is already in the booking list`, 'error');
        return;
      }
      active.push({ ...selected });
    }
    renderPilgrims(active);
    setStatus(`➕ Added ${selected.name} to booking list`, 'running');
  }
});
