# TTD Seva, Special Entry Darshan & Angapradakshinam Booking Bot (v5.3)

A premium, glassmorphic Chrome Extension to automate booking on the official Tirumala Tirupati Devasthanams (TTD) ticket portal. Built for speed, resilience, and convenience during high-demand booking releases.

---

## 🌟 Features

### 1. Booking Modes
- **🛕 Arjitha Seva**: Choose temple, seva names, preferred dates, and ticket counts.
- **🎫 Special Entry Darshan (₹300)**: No temple/seva selection required. Auto-selects dates and loops through multiple preferred hourly slots.
- **🛐 Angapradakshinam**: Shares the same calendar and slot-selection logic as Special Entry. Selects dates, ticket counts, and loops through preferred slots.

### 2. Pilgrim Master List (Local Persistence)
- Save frequently booked pilgrim lists securely within the browser (`chrome.storage.local`).
- One-click `➕ Add` button to quickly load saved pilgrims into your active booking form.
- Automatically handles duplication checking to avoid adding the same pilgrim twice.

### 3. Smart & Resilient Slot Selection
- **Time Normalization**: Accepts flexible inputs like `10 AM`, `10:00 am`, or `02:00 PM` and matches them to TTD's exact card format (`Slot Time 10:00 am`).
- **Multi-Slot Retries**: If your primary preferred slot becomes full or blocked, the bot will auto-dismiss warning popups and attempt subsequent preferred slots for the same date before trying next dates.
- **Disabled Timeout Protection**: If the site blocks a slot selection causing the Continue button to stay disabled, the bot times out after 4.5 seconds and advances to try another slot.

---

## 🛠️ Installation

1. Clone or download this repository.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** in the top-left corner.
5. Select the repository folder containing `manifest.json`.
6. Pin the extension for quick sidepanel access.

---

## ⚙️ Configuration

Open the sidepanel by clicking the extension icon. Fill in the following fields:

### 📱 Login Section
- **Mobile Number**: Enter your 10-digit mobile number.
- *Note: You must input the OTP manually in the browser when prompted.*

### ⏱️ Seva Preferences
- **Booking Mode**: Toggle between **Arjitha Seva**, **Special Entry**, and **Angapradakshinam**.
- **Preferred Time Slots** *(Special Entry Darshan & Angapradakshinam)*: List your target times (one per line, e.g., `10 AM`, `02:00 PM`).
- **Target Time**: Set the target release time (HH:MM:SS format). The bot will auto-click and proceed at this exact moment.
- **Tickets**: Choose the number of tickets to book (1 to 6).
- **Preferred Dates**: Enter dates in `DD-MM-YYYY` format (one per line). The bot will loop through them in order of priority.

### 📋 General & Pilgrim Details
- **General Details**: Gothram, Email, City, State, Country, and Pincode.
- **Pilgrim Details**: Enter Name, Age, Gender, Photo ID type, and ID number.
- **Pilgrim Master List**: Click `💾 Save Active Pilgrims to Master List` to store them for future runs.

---

## 🚀 How to Run

1. Navigate to the official TTD ticket booking site: `https://ttdevasthanams.ap.gov.in/`.
2. Open the sidepanel, select your booking mode, and configure details.
3. Click **🚀 Start Bot**.
4. The bot will watch the page:
   - Auto-enter your phone number and wait for OTP.
   - Navigate to the chosen booking portal.
   - Wait for curtain releases, bypass queues, and click available dates and slots.
   - Auto-fill contact details and pilgrim forms.
5. **Manual action required**: Enter OTP and verify the final payment gateway screen.

---

## 📦 Building & Releasing

### Local build

```bash
./scripts/bundle.sh          # -> dist/ttd-seva-bot-<version>.zip
```

The script zips an explicit file list (not the working tree), so local scratch
files can never leak into a store upload. It needs `firebase-config.js` present
— that file is gitignored, so a fresh clone must supply it before building.

### Automated release

`.github/workflows/release.yml` builds the zip and uploads it to the Chrome Web
Store **as a draft**. Publishing stays manual: review the draft in the developer
dashboard and click Publish there, which is what submits it to Google's review.

To cut a release, bump `manifest.json` then tag it — the workflow fails fast if
the tag and the manifest version disagree:

```bash
git tag v5.4 && git push origin v5.4
```

You can also run it from the Actions tab; the upload only happens there if you
tick the `upload` box.

**Required repository secrets** (Settings → Secrets and variables → Actions):

| Secret | What it is |
| --- | --- |
| `FIREBASE_CONFIG_JS` | Full contents of `firebase-config.js`. Without it the bundle installs but stalls behind the login overlay. |
| `CHROME_EXTENSION_ID` | Item id from the Web Store dashboard URL. |
| `CHROME_CLIENT_ID` | OAuth client id (Google Cloud console). |
| `CHROME_CLIENT_SECRET` | OAuth client secret. |
| `CHROME_REFRESH_TOKEN` | OAuth refresh token for the Web Store API. |

> The built zip is also kept as a workflow artifact for 30 days. It contains
> `firebase-config.js`, so anyone who can read the repo can download it — the
> same values ship inside the published extension, but keep that in mind if the
> repo is public.

---

## 📜 License

For personal/non-commercial convenience booking. Use responsibly at release times.
