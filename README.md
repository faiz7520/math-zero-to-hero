# Math: Zero → Hero — installable app (v2)

Your 258-topic maths roadmap (counting → Galois theory) rebuilt as a **real phone app**: installs to the home screen, opens fullscreen with its own π icon, works with no internet, and **saves your progress on the device**.

It is a **PWA** (progressive web app) — one codebase that behaves like a native app on Android, iPhone/iPad and desktop.

**v2 is install-first:** the app asks you to install (dashboard card, welcome popup, bottom banner — all one tap), and it protects your progress with a persistent-storage request, an auto-save when the app is backgrounded, a backup status card, and a **Share backup → Drive/WhatsApp** button.

---

## What's inside

| File | What it is |
|---|---|
| `index.html` | The whole tracker (curriculum, drills, plan, notes) + the phone-app shell |
| `pwa.js` | App layer: bottom navigation, install flow, offline handling, backup |
| `pwa.css` | Phone shell styling (bottom tab bar, safe-area/notch handling, sheets) |
| `manifest.webmanifest` | App name, icon, colours, fullscreen mode → makes it installable |
| `sw.js` | Service worker → caches the app so it opens offline |
| `icons/` | π app icon in every size Android/iOS ask for (incl. maskable) |
| `serve.py` | One-command local server (installing needs http://, not a plain file) |
| `../single-file/math-zero-to-hero-app.html` | Optional: the same app as *one* file with everything inlined (easy to send on WhatsApp) |

---

## Put it online (needed for the easiest install)

An installable app must be served over `https://` — so give it a home on the internet once, and you get a permanent link. See **`GITHUB-PAGES.md`** for the full walkthrough. Three routes:

```bash
GITHUB_TOKEN=ghp_xxxx python3 ../github_pages.py    # Way 1: your own GitHub + Pages, automatic
NETLIFY_TOKEN=xxxx      python3 ../deploy_netlify.py # alternative: Netlify Drop API, automatic
```
…or follow **Way 2** in `GITHUB-PAGES.md` (drag-and-drop in the browser, no commands, ~3 minutes).
After it is live: `python3 ../qr.py` prints a QR code for `qr.png` — scan it with your phone.

## Install it on your phone

### The easy way (live link)
1. Open the app link in **Chrome (Android)** or **Safari (iPhone)**.
2. **Android:** tap the **Install** button in the app, or menu ⋮ → *Install app* / *Add to Home screen*.
3. **iPhone/iPad:** tap **Share** □↑ → **Add to Home Screen** → *Add*.
4. The π icon appears with your other apps. Open it — no browser bars, works offline.

> Tip: on iOS the install button can't be scripted by any website, so Safari's Share menu is the only route. The app shows a short "how" sheet for it.

### From your own computer (same Wi-Fi)
```bash
cd math-roadmap-app
python3 serve.py            # → http://localhost:8000
```
Then on the phone open `http://<your-computer-ip>:8000` and install as above.
Over plain `http://` on your LAN, Chrome still allows "Add to Home screen" (install button appears for `https://` and `localhost`).
Nothing leaves your network; the server is read-only file serving.

### Fully offline copy on the phone
Copy the `math-roadmap-app` folder to the phone (or just `single-file/math-zero-to-hero-app.html`) and open it — everything works; only the install prompt and the update cache are skipped, because browsers don't allow installs from `file://` URLs.

---

## Your data (v2 safety net)

- Progress (ticks, notes, error log, streak, drill history) is stored **only on the device**, in the browser's localStorage. No account, no server, nothing uploaded.
- The app requests **persistent storage** so the browser will not silently clear it, and re-saves whenever the app goes to the background (phones kill tabs aggressively).
- **Settings → Save my progress** shows whether protection is on and when you last backed up.
- **Backup:** *Settings → Backup* writes `math-hero-backup-YYYY-MM-DD.json` → keep it in Google Drive. The app warns you if it's been more than ~a week.
- **Restore on a new phone:** install the app there, then *Settings → Restore from backup* and pick that file.
- Installing the app does **not** reset your progress: same browser, same storage key (`mzh.v1`) as your original tracker, so if you used the old file in this browser your ticks are already there.

---

## Rebuilding / verifying

```bash
python3 build.py           # rebuild math-roadmap-app/index.html from the Drive source copy
python3 build_single.py    # rebuild the one-file version
bash tests/test.sh         # static checks + 29-assertion DOM smoke test (jsdom)
```

`tests/smoke.mjs` boots the real app in a DOM and verifies: curriculum loads (16 stages / 258 topics), all 7 tabs render, ticking a topic persists, the install card and its sheet work, the `?go=drill` home-screen shortcut works, and every asset the manifest points at exists.

---

## Notes

- The app is **mobile-first**: on a narrow screen the top tab strip is replaced by a thumb-reach bottom bar; on a wide screen it looks exactly like the original tracker (nothing removed).
- Home-screen shortcuts: the manifest exposes **Today's plan**, **Daily drill** and **Roadmap** (long-press the icon on Android).
- Printing still works: *Settings → Print / save as PDF* prints the full roadmap and hides the app chrome.
