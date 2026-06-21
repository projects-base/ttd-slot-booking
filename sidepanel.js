/* ================================================================
   TTD Seva Booking Bot — sidepanel.js  v2.0
   ================================================================ */

const STORAGE_KEY = 'ttd_bot_v2';

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
  return {
    mobile:         document.getElementById('mobile').value.trim(),
    sevaName:       selectedText('sevaName'),
    templeName:     selectedText('templeName'),
    ticketCount:    document.getElementById('ticketCount').value.trim() || '01',
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
}

function loadConfig(cfg) {
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

  chrome.storage.local.set({ [STORAGE_KEY]: cfg });

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) { setStatus('❌ No active tab found', 'error'); return; }
    chrome.tabs.sendMessage(tabs[0].id, { action: 'START_BOT', config: cfg }, resp => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, files: ['content.js'] }, () => {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'START_BOT', config: cfg });
        });
      }
    });
  });

  document.getElementById('startBtn').style.display = 'none';
  document.getElementById('stopBtn').style.display  = 'block';
  setStatus('🟡 Bot started — watching page...', 'running');
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
