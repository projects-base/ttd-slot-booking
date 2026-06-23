/* ================================================================
   TTD Seva Booking Bot — sidepanel.js
   Supports: Arjitha Seva + Special Entry modes
   ================================================================ */

const STORAGE_KEY = 'ttd_bot_v2';
const MASTER_KEY = 'ttd_master_pilgrims';
let currentMode = 'arjitha_seva'; // 'arjitha_seva' | 'special_entry'
let masterPilgrims = [];

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
});

// ── BOOKING MODE TOGGLE ───────────────────────────────────────
function setBookingMode(mode) {
  currentMode = mode;

  // Update toggle buttons
  document.getElementById('modeArjitha').classList.toggle('active', mode === 'arjitha_seva');
  document.getElementById('modeSpecial').classList.toggle('active', mode === 'special_entry');
  document.getElementById('modeAngapradakshanam').classList.toggle('active', mode === 'angapradakshanam');

  // Update header subtitle
  let subtitle = 'Arjitha Seva Booking';
  if (mode === 'special_entry') subtitle = 'Special Entry Booking';
  else if (mode === 'angapradakshanam') subtitle = 'Angapradakshanam Booking';
  document.getElementById('headerSub').textContent = subtitle;

  // Toggle info banner text dynamically
  const infoEl = document.getElementById('specialInfo');
  if (infoEl) {
    if (mode === 'special_entry') {
      infoEl.textContent = '🕉️ Special Entry Darshan — no temple/seva selection needed. Pick your date and time slots.';
    } else if (mode === 'angapradakshanam') {
      infoEl.textContent = '🕉️ Angapradakshanam — no temple/seva selection needed. Pick your date and time slots.';
    }
  }

  // Toggle field visibility
  document.querySelectorAll('.mode-arjitha-only').forEach(el => {
    el.classList.toggle('hidden', mode !== 'arjitha_seva');
  });
  document.querySelectorAll('.mode-special-only').forEach(el => {
    el.classList.toggle('hidden', mode !== 'special_entry' && mode !== 'angapradakshanam');
  });
}

// Wire up mode toggle buttons
document.getElementById('modeArjitha').addEventListener('click', () => setBookingMode('arjitha_seva'));
document.getElementById('modeSpecial').addEventListener('click', () => setBookingMode('special_entry'));
document.getElementById('modeAngapradakshanam').addEventListener('click', () => setBookingMode('angapradakshanam'));

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
  return idx >= 0 ? sel.options[idx].text.trim() : '';
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

function getConfig() {
  const cfg = {
    bookingMode:    currentMode,
    mobile:         document.getElementById('mobile').value.trim(),
    targetTime:     document.getElementById('targetTime').value.trim(),
    preferredDates: document.getElementById('preferredDates').value
      .split('\n').map(d => d.trim()).filter(d => /^\d{2}-\d{2}-\d{4}$/.test(d)),
    general: {
      gothram:  document.getElementById('gothram').value.trim(),
      email:    document.getElementById('email').value.trim(),
      city:     document.getElementById('city').value.trim(),
      state:    document.getElementById('state').value.trim(),
      country:  document.getElementById('country').value.trim(),
      pincode:  document.getElementById('pincode').value.trim(),
    },
    pilgrims: collectPilgrims()
  };

  cfg.ticketCount = document.getElementById('ticketCount').value.trim() || '01';

  if (currentMode === 'arjitha_seva') {
    cfg.sevaName    = selectedText('sevaName');
    cfg.templeName  = selectedText('templeName');
  } else {
    // Special Entry mode
    cfg.preferredSlots = document.getElementById('preferredSlots').value
      .split('\n').map(s => s.trim()).filter(s => s.length > 0);
    cfg.sevaName       = '';
    cfg.templeName     = '';
  }

  return cfg;
}

function loadConfig(cfg) {
  // Restore booking mode first
  if (cfg.bookingMode) {
    setBookingMode(cfg.bookingMode);
  }

  document.getElementById('mobile').value         = cfg.mobile        || '';
  document.getElementById('ticketCount').value    = cfg.ticketCount   || '01';
  document.getElementById('targetTime').value     = cfg.targetTime    || '10:00:00';
  document.getElementById('preferredDates').value = (cfg.preferredDates || []).join('\n');
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
  const cfg = getConfig();

  // Common validation
  if (!cfg.mobile || cfg.mobile.length !== 10) {
    setStatus('❌ Enter a valid 10-digit mobile number', 'error'); return;
  }
  if (!cfg.preferredDates.length) {
    setStatus('❌ Add at least one date in DD-MM-YYYY format', 'error'); return;
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
  } else if (cfg.bookingMode === 'special_entry' || cfg.bookingMode === 'angapradakshanam') {
    if (!cfg.preferredSlots || !cfg.preferredSlots.length) {
      setStatus('❌ Add at least one preferred time slot (e.g. 10 AM)', 'error'); return;
    }
  }

  chrome.storage.local.set({ [STORAGE_KEY]: cfg });

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
  else if (cfg.bookingMode === 'angapradakshanam') modeLabel = 'Angapradakshanam';
  
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
