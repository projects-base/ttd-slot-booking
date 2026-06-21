/* ================================================================
   TTD Seva Booking Bot — content.js  v3.0
   Selector strategy: NO hashed CSS class names.
   Uses: text content, input[name], ARIA roles, URL paths, DOM structure.
   ================================================================ */

let botConfig = null;
let botActive = false;
let botInterval = null;
let currentStep = 'IDLE';
let currentDateIndex = 0;

// ================================================================
// UTILITIES
// ================================================================

function sendStatus(message, type = 'running', done = false) {
  try { chrome.runtime.sendMessage({ action: 'STATUS_UPDATE', message, type, done }); } catch (e) { }
  console.log('[TTD-BOT]', message);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// React-compatible value setter
function setReactValue(el, value) {
  if (!el) return;
  const proto = (el.tagName === 'TEXTAREA')
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
}

function clickEl(el) {
  if (!el) return false;
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  el.click();
  return true;
}

// ── STABLE TEXT-BASED FINDER ──────────────────────────────────
// Finds an element by exact or partial visible text within a CSS selector scope
function findByText(cssSelector, text, exact = true) {
  const els = document.querySelectorAll(cssSelector);
  for (const el of els) {
    const t = el.textContent.trim();
    if (exact ? t === text : t.toLowerCase().includes(text.toLowerCase())) {
      return el;
    }
  }
  return null;
}

// ── VISIBLE ELEMENT CHECK ─────────────────────────────────────
function isVisible(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
}

// ── DROPDOWN SELECTION — highly robust text-based matching ──────
async function selectDropdown(inputEl, optionText) {
  if (!inputEl) return false;

  // 1. Handle standard native <select> elements
  if (inputEl.tagName === 'SELECT') {
    const opts = Array.from(inputEl.options);
    const target = opts.find(o => o.text.toLowerCase().includes(optionText.toLowerCase()));
    if (target) {
      inputEl.value = target.value;
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(200);
      return true;
    }
    return false;
  }

  // 2. Handle custom React dropdowns
  clickEl(inputEl);
  await sleep(300); // Give React just enough time to render

  const lowerText = optionText.toLowerCase();

  // Find all elements containing the text
  const candidates = Array.from(document.querySelectorAll('li, div, span, p'))
    .filter(el => isVisible(el) && el.textContent.trim().toLowerCase().includes(lowerText));

  // Sort candidates by length of text (shortest first, to find the most exact match)
  candidates.sort((a, b) => a.textContent.trim().length - b.textContent.trim().length);

  if (candidates.length > 0) {
    const targetItem = candidates[0];

    // Shotgun click item and its parent
    clickEl(targetItem);
    if (targetItem.parentElement) clickEl(targetItem.parentElement);

    await sleep(100);
    return true;
  }

  // If not found, try to click input again to close it
  clickEl(inputEl);
  return false;
}

// ================================================================
// PAGE DETECTION — URL-based + structural (no hashed classes)
// ================================================================

const PATH = () => window.location.pathname;

function isCurtainPage() {
  return PATH().includes('curtain');
}

function isQueuePage() {
  // Queue page shows a MM:SS countdown timer — detect by text pattern
  return !!getQueueTimerEl();
}

function isSlotBookingPage() {
  // Calendar has <td> elements with plain day numbers like "1", "15", "30"
  // OR the page has the "scrollSlotType" element (which is the Seva selection card container)
  const hasCalendar = Array.from(document.querySelectorAll('td')).some(td => /^\d{1,2}$/.test(td.textContent.trim()));
  const hasSlotCards = !!document.getElementById('scrollSlotType');
  const hasTempleInput = !!document.querySelector('input[name="templeSelected"]');

  return hasCalendar || hasSlotCards || hasTempleInput;
}

function isPilgrimFormPage() {
  // Check for common pilgrim inputs or unique classes from the pilgrim details page
  return !!document.querySelector('input[name="pilgrimEmail"]') ||
    !!document.querySelector('input[name="age"], input[name="Age"]') ||
    !!document.querySelector('input[name="name"], input[name="Name"]') ||
    !!document.querySelector('[class*="accordionPilgrimDetails"]');
}

function isReviewPage() {
  // Review page has a Confirm button or "review" in the URL
  if (PATH().includes('review') || PATH().includes('confirm')) return true;
  // Or find a visible "Confirm" button
  return !!Array.from(document.querySelectorAll('button'))
    .find(b => /^confirm$/i.test(b.textContent.trim()) && isVisible(b));
}

function isPaymentPage() {
  return PATH().includes('payment') ||
    !!Array.from(document.querySelectorAll('button, a'))
      .find(el => /pay now|proceed to pay/i.test(el.textContent));
}

function isLoggedIn() {
  // If we see "Logout" or user profile button, we are logged in.
  // Or if we are already on inner pages like slot-booking or pilgrim-details.
  return !!findByText('a, button, span, li', 'Logout', false) ||
    isSlotBookingPage() ||
    isPilgrimFormPage();
}

// ================================================================
// QUEUE TIMER — detect MM:SS text pattern
// ================================================================

function getQueueTimerEl() {
  return Array.from(document.querySelectorAll('div, span, p'))
    .find(el => /^\d{2}:\d{2}$/.test(el.textContent.trim()) && el.children.length === 0);
}

function getQueueSecondsLeft() {
  const el = getQueueTimerEl();
  if (!el) return 0;
  const [mm, ss] = el.textContent.trim().split(':').map(Number);
  return (mm * 60) + ss;
}

// ================================================================
// SLOT BLOCKED DIALOG — detect any visible modal/dialog
// No hashed class names — uses role, structural, and text checks
// ================================================================

function getVisibleDialog() {
  // 1. ARIA role dialog
  const roleDialog = Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"]'))
    .find(el => isVisible(el));
  if (roleDialog) return roleDialog;

  // 2. Any visible element whose class contains "dialog" or "modal" (case-insensitive)
  return Array.from(document.querySelectorAll('[class]'))
    .find(el => {
      const cls = el.className?.toLowerCase?.() || '';
      return (cls.includes('dialog') || cls.includes('modal') || cls.includes('overlay'))
        && isVisible(el)
        && el.textContent.trim().length > 10;
    }) || null;
}

function isSlotBlockedVisible() {
  const dialog = getVisibleDialog();
  if (!dialog) return false;
  const text = dialog.textContent.toLowerCase();
  // Must contain slot-related blocking language
  return text.includes('sorry') || text.includes('slot') || text.includes('unavailable') || text.includes('alert');
}

async function handleSlotBlocked() {
  const dialog = getVisibleDialog();
  const msg = dialog?.textContent?.trim()?.substring(0, 60) || 'Slot unavailable';
  sendStatus(`⚠️ Slot blocked: "${msg}..."`, 'error');

  // Click Retry / OK / Close button inside dialog (text-based)
  const retryBtn = dialog
    ? Array.from(dialog.querySelectorAll('button'))
      .find(b => /retry|ok|close|done|yes/i.test(b.textContent.trim()))
    : Array.from(document.querySelectorAll('button'))
      .find(b => /retry/i.test(b.textContent.trim()) && isVisible(b));

  if (retryBtn) { retryBtn.click(); await sleep(700); }

  const dates = botConfig.preferredDates || [];
  currentDateIndex++;

  if (currentDateIndex < dates.length) {
    botConfig.sevaDate = dates[currentDateIndex];
    sendStatus(`📅 Trying date ${currentDateIndex + 1}/${dates.length}: ${botConfig.sevaDate}`);

    // Find "Edit" button for Seva Details — first visible edit button on the page
    // (text-based, no class dependency)
    const editBtn =
      findByText('button, [role="button"]', 'Edit', true) ||
      Array.from(document.querySelectorAll('button, span, div'))
        .find(el => /^edit$/i.test(el.textContent.trim()) && isVisible(el));

    if (editBtn) {
      editBtn.click();
      await sleep(1200);
      currentStep = 'SELECTING_SLOT';
    }
  } else {
    sendStatus(`❌ All ${dates.length} preferred dates exhausted. Bot stopped.`, 'error', true);
    botActive = false;
    clearInterval(botInterval);
    botInterval = null;
  }
}

// ================================================================
// STEP: LOGIN
// ================================================================

async function doLogin() {
  // Step 0: If the mobile input isn't visible, we need to click the Login button first
  // The TTD login modal has TWO inputs:
  //  1. A fixed "(+91)" country code prefix (NOT the phone field)
  //  2. The actual 10-digit phone number input (maxlength="10")
  let mobileInput = document.querySelector('input[maxlength="10"][type="text"], input[name="mobileNo"], input[placeholder*="mobile" i]');

  if (!mobileInput || !isVisible(mobileInput)) {
    // Look for a Login / Sign In button on the page to open the modal
    const loginBtn = Array.from(document.querySelectorAll('button, a, span, div, li'))
      .find(el => /^(login|log in|sign in)$/i.test(el.textContent.trim()) && isVisible(el));

    if (loginBtn) {
      sendStatus('🔐 Clicking Login button to open form...');
      clickEl(loginBtn);
      await sleep(500);
    } else {
      sendStatus('🔐 Waiting for login form to appear...', 'running');
    }
    return; // Will retry on next interval tick
  }

  const cleanMobile = String(botConfig.mobile).replace(/\D/g, '');
  const currentVal = mobileInput.value.replace(/\D/g, '');

  if (currentVal === cleanMobile) {
    sendStatus('📱 Mobile already entered — looking for OTP button...');
  } else {
    sendStatus('📱 Entering mobile number...');
    mobileInput.focus();
    mobileInput.click();

    // Clear the field first
    setReactValue(mobileInput, '');
    await sleep(100);

    // Type character by character to trigger React's keydown handlers
    for (const char of cleanMobile) {
      mobileInput.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
      mobileInput.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));

      // Use native setter to append the char
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      const newVal = mobileInput.value + char;
      if (setter) setter.call(mobileInput, newVal);
      mobileInput.dispatchEvent(new Event('input', { bubbles: true }));

      mobileInput.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
      await sleep(30);
    }

    mobileInput.dispatchEvent(new Event('change', { bubbles: true }));
    mobileInput.dispatchEvent(new Event('blur', { bubbles: true }));
    await sleep(300);
  }

  // Find and click the "Get OTP" button by text
  const otpBtn = Array.from(document.querySelectorAll('button'))
    .find(b => /otp|send otp|get otp/i.test(b.textContent.trim()));
  if (otpBtn && !otpBtn.disabled) {
    otpBtn.click();
    sendStatus('📨 OTP requested — please enter OTP in the browser!');
    currentStep = 'WAITING_OTP';
  } else if (!otpBtn) {
    sendStatus('📱 OTP button not found yet — retrying...', 'running');
  }
}

function isLoggedIn() {
  return !!Array.from(document.querySelectorAll('span, li, a, button, div'))
    .find(el => {
      const t = el.textContent.trim().toLowerCase();
      return t === 'log out' || t === 'logout' || t === 'sign out';
    });
}

// ================================================================
// STEP: NAVIGATE TO SEVA
// Text-based nav clicking — no hashed class names
// ================================================================

async function navigateToSeva() {
  // The TTD nav uses a CSS hover dropdown — sub-items are always in DOM but hidden by CSS.
  // Strategy: hover over the "Online Services" <li>, then directly click the target <span>.
  const navStep = botConfig._navStep || 0;

  if (navStep === 0) {
    // Find the "Online Services" <li> and dispatch hover events to open the dropdown
    const onlineSvcLi = Array.from(document.querySelectorAll('li'))
      .find(li => li.textContent.trim().startsWith('Online Services') && isVisible(li));

    if (onlineSvcLi) {
      sendStatus('🧭 Hovering over Online Services to open menu...');
      // Trigger CSS hover
      onlineSvcLi.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      onlineSvcLi.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      onlineSvcLi.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
      clickEl(onlineSvcLi);
      botConfig._onlineSvcLi = true;
      botConfig._navStep = 1;
    } else {
      sendStatus('🧭 Waiting for navigation to load...', 'running');
    }
    return;
  }

  if (navStep === 1) {
    // The "Online Services" li is now hovered. Find "Arjitha Sevas" span directly.
    // Sub-menu items are in DOM regardless of hover — find the span by exact text.
    const arjithaSpan = Array.from(document.querySelectorAll('li span, li div'))
      .find(el => el.textContent.trim() === 'Arjitha Sevas');

    if (arjithaSpan) {
      sendStatus('🛕 Clicking Arjitha Sevas...');
      // Re-hover Online Services to keep dropdown open, then click
      const onlineSvcLi = Array.from(document.querySelectorAll('li'))
        .find(li => li.textContent.trim().startsWith('Online Services') && isVisible(li));
      if (onlineSvcLi) {
        onlineSvcLi.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      }
      clickEl(arjithaSpan);
      botConfig._navStep = 2;
    } else {
      sendStatus('🛕 Arjitha Sevas not found in DOM — retrying...', 'running');
      botConfig._navStep = 0; // Reset and re-hover
    }
    return;
  }

  if (navStep === 2) {
    // If on slot booking page already, we're done
    if (isSlotBookingPage()) {
      sendStatus('✅ Reached slot booking page!');
      currentStep = 'SELECTING_SLOT';
      return;
    }
    // Done navigating — move to WAITING_CURTAIN
    sendStatus('🛕 Navigated — waiting for curtain/slot page...');
    currentStep = 'WAITING_CURTAIN';
  }
}

// ================================================================
// STEP: CURTAIN PAGE — wait for target time then click
// ================================================================

function shouldClickNow() {
  if (!botConfig.targetTime) return false;
  const [hh, mm, ss] = botConfig.targetTime.split(':').map(Number);
  const now = new Date();
  return (
    now.getHours() === hh &&
    now.getMinutes() === mm &&
    now.getSeconds() >= (ss || 0)
  );
}

async function clickSevaAtTime() {
  sendStatus('⏰ Target time reached! Clicking seva link...');

  // Find seva link by seva name text, or generic booking buttons
  const link =
    (botConfig.sevaName && findByText('a, button', botConfig.sevaName, false)) ||
    findByText('a, button', 'Book Now', false) ||
    findByText('a, button', 'Click Here', false) ||
    findByText('a, button', 'Proceed', false);

  if (link) {
    link.click();
    sendStatus('✅ Seva link clicked — entering queue...');
    currentStep = 'IN_QUEUE';
  } else {
    sendStatus('⚠️ Seva link not found on curtain page — please click manually', 'error');
  }
}

// ================================================================
// STEP: SLOT BOOKING — date, seva card, ticket count
// Calendar detection: structural <td> matching + month-year text
// ================================================================

async function selectTempleAndSeva() {
  const templeInput = document.querySelector('input[name="templeSelected"]');
  if (templeInput && botConfig.templeName && !botConfig._templeAttempted) {
    const currentVal = templeInput.value.toLowerCase().trim();
    const targetVal = botConfig.templeName.toLowerCase().trim();
    if (currentVal !== targetVal && !currentVal.includes(targetVal) && !targetVal.includes(currentVal)) {
      await selectDropdown(templeInput, botConfig.templeName);
      sendStatus(`🛕 Temple selected: ${botConfig.templeName}`);
      await sleep(100);
    }
    botConfig._templeAttempted = true; // Prevent infinite loop if text mismatch
  }

  const sevaInput = document.querySelector('input[name="sevaSelected"]');
  if (sevaInput && botConfig.sevaName && !botConfig._sevaAttempted) {
    const currentVal = sevaInput.value.toLowerCase().trim();
    const targetVal = botConfig.sevaName.toLowerCase().trim();
    if (currentVal !== targetVal && !currentVal.includes(targetVal) && !targetVal.includes(currentVal)) {
      await selectDropdown(sevaInput, botConfig.sevaName);
      sendStatus(`🛕 Seva selected: ${botConfig.sevaName}`);
      await sleep(100);
    }
    botConfig._sevaAttempted = true;
  }
}

function findDateCell(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const targetMonthYear = `${MONTHS[month]} ${year}`; // e.g. "June 2026"

  // Strategy 1: find containers that include the month-year header text,
  // then look for <td> with the exact day number inside them.
  const containers = Array.from(
    document.querySelectorAll('table, [class*="calendar"], [class*="Calendar"], [class*="month"], [class*="Month"]')
  );
  for (const container of containers) {
    if (container.textContent.includes(targetMonthYear)) {
      const tds = Array.from(container.querySelectorAll('td'))
        .filter(td => td.textContent.trim() === String(day) && !td.querySelector('td'));
      if (tds.length > 0) return tds[0];
    }
  }

  // Strategy 2: TreeWalker to find month-year text node, then scan ancestor for <td>
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.textContent.trim() === targetMonthYear) {
      let ancestor = node.parentElement;
      for (let i = 0; i < 8; i++) {
        if (!ancestor) break;
        const tds = Array.from(ancestor.querySelectorAll('td'))
          .filter(td => td.textContent.trim() === String(day) && !td.querySelector('td'));
        if (tds.length > 0) return tds[0];
        ancestor = ancestor.parentElement;
      }
    }
  }

  return null;
}

async function selectSlotOptions() {
  sendStatus(`📅 Selecting date: ${botConfig.sevaDate} | Tickets: ${botConfig.ticketCount}`);

  // 0. Select Temple and Seva if dropdowns are present on this page
  await selectTempleAndSeva();

  // 1. Click the date cell
  const dateCell = findDateCell(botConfig.sevaDate);
  if (dateCell) {
    dateCell.click();
    sendStatus(`✅ Clicked date: ${botConfig.sevaDate}`);
    await sleep(300);
  } else {
    sendStatus(`⚠️ Date ${botConfig.sevaDate} not in calendar — trying next date`, 'error');
    currentDateIndex++;
    const dates = botConfig.preferredDates || [];
    if (currentDateIndex < dates.length) {
      botConfig.sevaDate = dates[currentDateIndex];
      sendStatus(`📅 Trying next: ${botConfig.sevaDate}`);
    } else {
      sendStatus('❌ No more preferred dates. Bot stopped.', 'error', true);
      botActive = false;
      clearInterval(botInterval);
    }
    return;
  }

  // 2. Click seva card — Find within #scrollSlotType and use shotgun click
  let targetCard = null;
  const slotContainer = document.getElementById('scrollSlotType') || document.body;

  // Find cards by looking for divs with cursor: pointer that have 'available'
  const cards = Array.from(slotContainer.querySelectorAll('div'))
    .filter(div => (div.style.cursor === 'pointer' || (div.className && div.className.includes('card'))) &&
      div.textContent.toLowerCase().includes('available') &&
      div.textContent.toLowerCase().includes('₹'));

  for (const c of cards) {
    if (botConfig.sevaName && c.textContent.toLowerCase().includes(botConfig.sevaName.toLowerCase())) {
      targetCard = c;
      break;
    }
  }
  if (!targetCard && cards.length > 0) {
    targetCard = cards[0]; // fallback
  }

  if (targetCard) {
    // Shotgun click: Click the card and all its inner elements to ensure React's hidden listener is triggered
    const clickables = [targetCard, ...Array.from(targetCard.querySelectorAll('button, div, span, img'))];
    for (const el of clickables.reverse()) {
      clickEl(el);
    }

    sendStatus('✅ Seva slot card selected');
    await sleep(100);
  } else {
    sendStatus('⚠️ Seva card not visible — proceeding anyway');
  }

  // 3. Select ticket count — input[name="noOfTickets"] is a stable name attribute
  const ticketInput = document.querySelector('input[name="noOfTickets"]');
  if (ticketInput && !ticketInput.disabled) {
    const result = await selectDropdown(ticketInput, botConfig.ticketCount);
    if (result) sendStatus(`🎟️ Tickets set to: ${botConfig.ticketCount}`);
    else sendStatus(`⚠️ Could not set ticket count to ${botConfig.ticketCount}`);
  } else if (ticketInput && ticketInput.disabled) {
    sendStatus(`🎟️ Ticket count is locked/disabled at: ${ticketInput.value}`);
  }

  await sleep(100);
  currentStep = 'CLICKING_CONTINUE_SLOT';
}

// ================================================================
// STEP: FILL GENERAL DETAILS
// All fields use stable input[name="X"] selectors
// ================================================================

async function fillGeneralDetails() {
  sendStatus('📋 Filling General Details...');
  await sleep(100);

  const g = botConfig.general;
  const fields = {
    gothram: g.gothram,
    pilgrimEmail: g.email,
    pilgrimCity: g.city,
    pilgrimState: g.state,
    pilgrimCountry: g.country || 'India',
    pilgrimPincode: g.pincode
  };

  for (const [fieldName, value] of Object.entries(fields)) {
    const el = document.querySelector(`input[name="${fieldName}"]`);
    if (el && value) {
      el.focus();
      setReactValue(el, value);
      await sleep(50);
    }
  }

  sendStatus('✅ General Details filled');
}

// ================================================================
// STEP: FILL PILGRIM DETAILS
// Row detection: structural — find ancestor that groups name+age+gender
// No hashed class names
// ================================================================

function getPilgrimRows() {
  // Each pilgrim row has input[name="name"] or similar.
  const nameInputs = Array.from(document.querySelectorAll('input[name="name" i], input[placeholder*="name" i]'));
  return nameInputs.map(nameInput => {
    let container = nameInput.parentElement;
    for (let depth = 0; depth < 10; depth++) {
      if (!container) break;
      if (container.querySelector('input[name="age" i], input[placeholder*="age" i]') &&
        container.querySelector('input[name="gender" i], input[placeholder*="gender" i], div[class*="gender"]')) {
        return container;
      }
      container = container.parentElement;
    }
    return nameInput.closest('tr, [class*="row"], [class*="item"], [class*="pilgrim"]')
      || nameInput.parentElement?.parentElement;
  }).filter(Boolean);
}

// ================================================================

function findInputByLabel(container, labelText) {
  // Find a text node or small element that says "Gender" or "Photo ID"
  const label = Array.from(container.querySelectorAll('label, span, div, p'))
    .find(el => el.textContent.trim().toLowerCase().includes(labelText.toLowerCase()) && el.children.length === 0);

  if (label) {
    // Go up one or two parent levels to find the adjacent input/select
    let parent = label.parentElement;
    for (let i = 0; i < 4; i++) {
      if (!parent) break;
      const input = parent.querySelector('input, select');
      if (input && input.type !== 'hidden') return input;
      parent = parent.parentElement;
    }
  }
  return null;
}

async function fillPilgrimDetails() {
  sendStatus('👤 Filling Pilgrim Details...');
  await sleep(600);

  const pilgrimRows = getPilgrimRows();
  const pilgrims = botConfig.pilgrims || [];

  for (let i = 0; i < pilgrims.length; i++) {
    const row = pilgrimRows[i];
    if (!row) {
      sendStatus(`⚠️ Pilgrim row ${i + 1} not found in DOM`, 'error');
      break;
    }
    const p = pilgrims[i];

    // Find inputs within this specific row safely
    const nameEl = row.querySelector('input[name="name" i], input[placeholder*="name" i]') || findInputByLabel(row, 'name');
    const ageEl = row.querySelector('input[name="age" i], input[placeholder*="age" i]') || findInputByLabel(row, 'age');
    const genderEl = row.querySelector('input[name="gender" i], select[name="gender" i], input[placeholder*="gender" i]') || findInputByLabel(row, 'gender');
    const idTypeEl = row.querySelector('input[name="idType" i], input[name="idProof" i], select[name="idType" i], select[name="idProof" i], input[placeholder*="id" i]') || findInputByLabel(row, 'id proof') || findInputByLabel(row, 'photo id');
    const idNumEl = row.querySelector('input[name="idNumber" i], input[placeholder*="number" i]') || findInputByLabel(row, 'number');

    if (nameEl && p.name) { nameEl.focus(); setReactValue(nameEl, p.name); await sleep(50); }
    if (ageEl && p.age) { ageEl.focus(); setReactValue(ageEl, String(p.age)); await sleep(50); }

    if (genderEl && p.gender) {
      const ok = await selectDropdown(genderEl, p.gender);
      if (!ok) sendStatus(`⚠️ Could not set gender for pilgrim ${i + 1}`);
    }

    if (idTypeEl && p.idType) {
      const ok = await selectDropdown(idTypeEl, p.idType);
      if (!ok) sendStatus(`⚠️ Could not set ID type for pilgrim ${i + 1}`);
    }

    if (idNumEl && p.idNumber) { idNumEl.focus(); setReactValue(idNumEl, p.idNumber); await sleep(50); }

    sendStatus(`✅ Pilgrim ${i + 1} filled: ${p.name}`);
    await sleep(50);
  }

  currentStep = 'CLICKING_CONTINUE_PILGRIM';
}

// ================================================================
// CONTINUE BUTTON — find by text, no class dependency
// ================================================================

let waitContinueLogs = 0;

async function clickContinue() {
  const btn = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]'))
    .find(b => {
      const t = (b.textContent || b.value || '').trim().toLowerCase();
      return (t === 'continue' || t === 'confirm' || t === 'proceed' || t === 'next' || t === 'book now' || t === 'pay now' || t === 'make payment' || t === 'proceed to pay') && isVisible(b);
    });

  if (btn) {
    const isDisabled = btn.disabled ||
      btn.hasAttribute('disabled') ||
      btn.getAttribute('aria-disabled') === 'true' ||
      (btn.className && typeof btn.className === 'string' && btn.className.toLowerCase().includes('disabled'));

    if (isDisabled) {
      waitContinueLogs++;
      if (waitContinueLogs % 3 === 1) { // Log occasionally to avoid spam
        sendStatus('⏳ Waiting for Continue button to enable (Select the slot manually if stuck!)', 'running');
      }
      return false;
    }

    clickEl(btn); // Use robust click
    waitContinueLogs = 0;
    sendStatus(`▶️ "${btn.textContent.trim()}" clicked`);
    return true;
  }
  return false;
}

// ================================================================
// MAIN BOT LOOP — 1.5 second interval
// ================================================================

async function runBotStep() {
  if (!botActive || !botConfig) return;

  try {
    // ── PRIORITY 1: Slot blocked dialog ────────────────────────
    if (isSlotBlockedVisible()) {
      await handleSlotBlocked();
      return;
    }

    // ── PRIORITY 2: Page-change detection ──────────────────────
    // Allow the bot to pick up the flow even if started mid-way on these pages
    if (isPaymentPage() && currentStep !== 'PAYMENT') {
      currentStep = 'PAY_NOW';
    } else if (isReviewPage() && currentStep !== 'CLICKING_CONTINUE_REVIEW' && currentStep !== 'PAY_NOW') {
      currentStep = 'CLICKING_CONTINUE_REVIEW';
    } else if (isPilgrimFormPage() && currentStep !== 'FILLING_GENERAL' && currentStep !== 'FILLING_PILGRIM' && currentStep !== 'CLICKING_CONTINUE_PILGRIM') {
      currentStep = 'FILLING_GENERAL';
    } else if (isSlotBookingPage() && currentStep === 'LOGIN') {
      currentStep = 'SELECTING_SLOT'; // Jump straight to slot booking if started here
    }

    // ── STEP MACHINE ────────────────────────────────────────────
    switch (currentStep) {

      case 'LOGIN':
        if (isLoggedIn()) {
          sendStatus('✅ Already logged in!');
          currentStep = 'NAVIGATE_SEVA';
          break;
        }
        await doLogin();
        break;

      case 'WAITING_OTP':
        if (isLoggedIn()) {
          sendStatus('✅ OTP verified! Navigating to seva...');
          currentStep = 'NAVIGATE_SEVA';
        } else {
          sendStatus('⏳ Waiting for OTP to be entered...');
        }
        break;

      case 'NAVIGATE_SEVA':
        await navigateToSeva();
        break;

      case 'WAITING_CURTAIN':
        if (isQueuePage()) {
          sendStatus('🎟️ Entered queue! Timer running...');
          currentStep = 'IN_QUEUE';
        } else if (isSlotBookingPage()) {
          sendStatus('✅ Slot booking page detected');
          currentStep = 'SELECTING_SLOT';
        } else if (isCurtainPage()) {
          const now = new Date().toLocaleTimeString();
          sendStatus(`⏳ Curtain page — waiting for ${botConfig.targetTime} (now: ${now})`);
          if (shouldClickNow()) await clickSevaAtTime();
        }
        break;

      case 'IN_QUEUE':
        if (isPilgrimFormPage()) {
          sendStatus('✅ Queue ended! Filling pilgrim form...');
          currentStep = 'FILLING_GENERAL';
        } else if (isSlotBookingPage()) {
          sendStatus('✅ Queue ended! On slot booking page.');
          currentStep = 'SELECTING_SLOT';
        } else if (isQueuePage()) {
          const secs = getQueueSecondsLeft();
          const mm = String(Math.floor(secs / 60)).padStart(2, '0');
          const ss = String(secs % 60).padStart(2, '0');
          sendStatus(`⏳ Queue timer: ${mm}:${ss} remaining — auto-redirect when done...`);
        }
        break;

      case 'SELECTING_SLOT':
        if (isSlotBookingPage()) {
          if (!botConfig.sevaDate) {
            botConfig.sevaDate = (botConfig.preferredDates || [])[currentDateIndex] || '';
          }
          await selectSlotOptions();
        }
        break;

      case 'CLICKING_CONTINUE_SLOT':
        if (await clickContinue()) {
          sendStatus('📋 Moving to Pilgrim Details form...');
          currentStep = 'FILLING_GENERAL';
        }
        break;

      case 'FILLING_GENERAL':
        if (isPilgrimFormPage()) {
          await fillGeneralDetails();
          currentStep = 'FILLING_PILGRIM';
        }
        break;

      case 'FILLING_PILGRIM':
        if (isPilgrimFormPage()) {
          await fillPilgrimDetails();
        }
        break;

      case 'CLICKING_CONTINUE_PILGRIM':
        if (await clickContinue()) {
          sendStatus('📝 Pilgrim details submitted — on review page...');
          currentStep = 'CLICKING_CONTINUE_REVIEW';
        }
        break;

      case 'CLICKING_CONTINUE_REVIEW':
        if (isReviewPage()) {
          await sleep(800);
          if (await clickContinue()) {
            const timeStr = botConfig._startTime ? ` (Time taken: ${((Date.now() - botConfig._startTime) / 1000).toFixed(1)}s)` : '';
            sendStatus(`✅ Final Confirm/Pay clicked!`)
            sendStatus(`🛑 Bot finished.${timeStr}`, 'success', true);

            botActive = false;
            if (botInterval) clearInterval(botInterval);
            currentStep = 'IDLE';
          }
        }
        break;

      case 'PAY_NOW':
      case 'PAYMENT':
        // Legacy states, no longer used
        break;

      case 'IDLE':
      default:
        break;
    }

  } catch (err) {
    sendStatus(`❌ Error in [${currentStep}]: ${err.message}`, 'error');
    console.error('[TTD-BOT] Error:', err);
  }
}

// ================================================================
// MESSAGE LISTENER
// ================================================================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.action === 'START_BOT') {
    botConfig = msg.config;
    botConfig._startTime = Date.now(); // Record start time
    botActive = true;
    currentStep = 'LOGIN';
    currentDateIndex = 0;
    botConfig.sevaDate = (botConfig.preferredDates || [])[0] || '';

    sendStatus('🚀 Bot started! Watching page...');
    if (botInterval) clearInterval(botInterval);
    botInterval = setInterval(runBotStep, 1500);
    sendResponse({ ok: true });
  }

  if (msg.action === 'STOP_BOT') {
    botActive = false;
    if (botInterval) { clearInterval(botInterval); botInterval = null; }
    currentStep = 'IDLE';
    sendStatus('⛔ Bot stopped by user', '', true);
    sendResponse({ ok: true });
  }

  return true;
});

console.log('[TTD-BOT] Content script v3.0 loaded on', window.location.pathname);