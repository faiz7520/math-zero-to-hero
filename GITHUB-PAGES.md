# Put this app online on your own GitHub (free, permanent link)

Goal: a link like `https://<your-username>.github.io/math-zero-to-hero/` that you open once on your phone, tap **Install**, and keep forever — with progress saved on the device.

You need a free GitHub account. Three ways, pick one.

---

## Way 1 — I do it for you (30 seconds of your time)

On this computer, one command:

```bash
cd ..                      # the folder that holds math-roadmap-app/
GITHUB_TOKEN=ghp_xxxxxxxx python3 github_pages.py
```

That script: verifies the token → creates the repo → pushes the app → switches on **Pages** → waits for the first build → prints your link (and saves it to `live-url.txt`).

**Which token?** github.com → *Settings* → *Developer settings* → *Personal access tokens*:

- **Classic** token with the **`repo`** scope (simplest, works for a public repo), **or**
- **Fine-grained** token with: *Contents* read/write, *Administration* read/write, *Pages* read/write.

Revoke it after (same page). The published site keeps working without the token.

Then: `python3 qr.py` → open `qr.png` → scan with your phone → install.

---

## Way 2 — you upload in the browser (no commands, ~3 minutes)

1. github.com → **New repository** → name `math-zero-to-hero` → **Public** → *Create*.
2. On the empty repo page click **uploading an existing file**.
3. Open `math-roadmap-app` in your file manager and drag **the contents** — `index.html`, `pwa.js`, `pwa.css`, `sw.js`, `manifest.webmanifest`, the `icons` folder and `.nojekyll` — into the page.
   ⚠️ Drag the *contents*, not the folder itself: `index.html` must sit at the top level of the repo.
4. **Commit changes**.
5. Repo → **Settings** → **Pages** → *Source*: **Deploy from a branch** → Branch: **main**, folder **/(root)** → **Save**.
6. Wait ~1 minute, reload the Pages settings screen — your link appears at the top: `https://<you>.github.io/math-zero-to-hero/`.
7. Open that link on your phone → **Install** (Android) or **Share → Add to Home Screen** (iPhone).

---

## Way 3 — git from your computer

```bash
git clone https://github.com/<you>/math-zero-to-hero.git
# copy the contents of math-roadmap-app/ into the clone (index.html at the top level)
cd math-zero-to-hero
git add -A && git commit -m "Math: Zero → Hero app" && git push
# then enable Pages: Settings → Pages → Deploy from a branch → main / (root)
```

---

## Updating the app later

Change anything in `math-roadmap-app/`, rebuild, and re-run your chosen way — the link stays the same:

```bash
python3 build.py            # if you edited the tracker source or pwa.js / pwa.css
GITHUB_TOKEN=ghp_xxxx python3 github_pages.py      # Way 1
# or just drag the changed files into the repo in the browser (Way 2)
```

Installed on a phone? It updates itself: the service worker fetches the new version next time the app has internet, and **Settings → Check for updates** forces it.

---

## Checklist before you share the link

- [ ] Opens with the π icon in the tab and a fullscreen app look after installing
- [ ] **Install card** at the top of the dashboard, plus a bottom install banner
- [ ] **Settings → Save my progress** shows storage protection + last backup
- [ ] Airplane mode: open the installed app → still works
- [ ] **Settings → Share backup → Drive** produces a `math-hero-backup-….json` (that is your restore file)
