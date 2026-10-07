/* ============================================================
   Math: Zero → Hero — phone-app layer (v2: install-first)
   Loaded by index.html. Adds:
     • bottom tab bar                      • install hero + banner + sheet
     • offline service worker              • storage persistence (progress safety)
     • share/backup my progress            • copy/share app link, update check
   It never touches your curriculum or your saved progress.
   ============================================================ */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var V = 'mzh-app-v2';

  /* ---------- environment ---------- */
  var standalone = false;
  try {
    standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
                 (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) ||
                 window.navigator.standalone === true;
  } catch (e) {}
  if (standalone) document.documentElement.classList.add('pwa-standalone');

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function isAndroid() { return /Android/i.test(navigator.userAgent); }
  function isPhone() { try { return window.matchMedia('(max-width:820px)').matches; } catch (e) { return true; } }
  function store(k, v) { try { localStorage.setItem(V + '.' + k, v); } catch (e) {} }
  function get(k) { try { return localStorage.getItem(V + '.' + k); } catch (e) { return null; } }
  function today() { try { return window.today(); } catch (e) { return ''; } }
  function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

  /* ---------- toasts (reuse the tracker's) ---------- */
  function toast(msg) {
    try { if (typeof window.toast === 'function') { window.toast(msg); return; } } catch (e) {}
    var el = $('#pwa-toast');
    if (!el) { el = document.createElement('div'); el.id = 'pwa-toast'; document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('on');
    clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('on'); }, 2500);
  }

  /* ---------- service worker: offline + updates ---------- */
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;   // file:// is already local
    try {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).then(function (reg) {
        window.__swReg = reg;
        reg.addEventListener('updatefound', function () {
          var nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', function () {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              store('updateReady', '1');
              toast('\u2B06\uFE0F Update ready — tap "Check for updates" in Settings');
            }
          });
        });
        if (!get('offlineReady')) {
          store('offlineReady', '1');
          setTimeout(function () { toast('\u2713 Saved for offline use'); }, 4000);
        }
      }).catch(function () {});
    } catch (e) {}
  }

  function checkForUpdates() {
    if (!window.__swReg) { location.reload(); return; }
    window.__swReg.update().then(function () {
      if (get('updateReady')) {
        get('updateReady'); store('updateReady', '');
        if (window.__swReg.waiting) window.__swReg.waiting.postMessage({ type: 'SKIP_WAITING' });
        toast('Updating\u2026');
        setTimeout(function () { location.reload(); }, 700);
      } else {
        toast('\u2713 You already have the latest version');
      }
    }).catch(function () { toast('Could not check right now (offline?)'); });
  }

  /* ---------- keep progress safe ---------- */
  function requestPersistence() {
    try {
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(function (granted) { store('persist', granted ? 'granted' : 'denied'); });
      }
    } catch (e) {}
  }
  function persistStatus() {
    var s = get('persist');
    if (s === 'granted') return ['\u2713 On', 'The browser will not clear this app\u2019s data automatically.'];
    if (s === 'denied') return ['Not granted yet', 'Android: Settings \u2192 Apps \u2192 Chrome \u2192 Storage. iPhone: keep the app installed and use it regularly.'];
    return ['\u2026', 'Protection is requested when you first save progress.'];
  }

  function backupJSON() {
    var S = window.S || {};
    return JSON.stringify(S);
  }
  function backupName() { return 'math-hero-backup-' + (today() || 'today') + '.json'; }

  function saveBackupFile() {
    try {
      if (typeof window.download === 'function') window.download(backupName(), backupJSON(), 'application/json');
      else {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([backupJSON()], { type: 'application/json' }));
        a.download = backupName();
        document.body.appendChild(a); a.click(); a.remove();
      }
      if (window.S) { window.S.lastBackup = today(); if (typeof window.save === 'function') window.save(); }
      toast('Backup saved \u2014 keep the file in Drive \u2713');
      return true;
    } catch (e) { toast('Could not create the backup file'); return false; }
  }

  /* Share the backup through the phone's share sheet → Drive, WhatsApp, Gmail… */
  function shareBackup() {
    var file = null;
    try {
      file = new File([backupJSON()], backupName(), { type: 'application/json' });
    } catch (e) { file = null; }

    if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      navigator.share({
        files: [file],
        title: 'Math Hero progress backup',
        text: 'My Math: Zero \u2192 Hero progress backup (restore it from Settings \u2192 Restore).'
      }).then(function () {
        if (window.S) { window.S.lastBackup = today(); if (typeof window.save === 'function') window.save(); }
        toast('Shared \u2713 \u2014 save it in Drive');
      }).catch(function () {});
      return;
    }
    if (navigator.share && !file) {                      // text-only fallback
      navigator.share({ title: 'Math Hero progress', text: progressSummary() }).catch(function () {});
      return;
    }
    saveBackupFile();                                    // last resort: download
    toast('Backup downloaded \u2014 move it to Drive when you get a chance');
  }

  function progressSummary() {
    try {
      var S = window.S, dn = window.doneCount ? window.doneCount() : 0;
      var tot = window.TOT ? window.TOT.topics : 258;
      var st = window.streak ? window.streak() : 0;
      var hrs = window.doneHours ? Math.round(window.doneHours()) : 0;
      var nx = window.nextUp ? window.nextUp() : null;
      return 'Math: Zero \u2192 Hero \u2014 ' + dn + '/' + tot + ' topics (' + Math.round(dn / tot * 100) + '%), ' +
             hrs + ' h done, ' + st + '-day streak' + (nx ? '. Next: ' + nx.t.n : '.') + '\n' + location.href;
    } catch (e) { return location.href; }
  }

  function copyLink() {
    var url = location.href.split('#')[0].split('?')[0];
    var done = function () { toast('Link copied \u2014 paste it on your phone'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { prompt('Copy this link:', url); });
    } else { prompt('Copy this link:', url); }
  }
  function shareLink() {
    var url = location.href.split('#')[0].split('?')[0];
    if (navigator.share) navigator.share({ title: 'Math: Zero \u2192 Hero', text: 'My maths roadmap app \u2014 install it from here:', url: url }).catch(function () {});
    else copyLink();
  }

  /* ---------- bottom navigation ---------- */
  var NAV = [
    ['dash', '\uD83C\uDFE0', 'Home'],
    ['road', '\uD83D\uDDFA\uFE0F', 'Roadmap'],
    ['drill', '\u26A1', 'Drill'],
    ['plan', '\uD83D\uDCC5', 'Plan'],
    ['notes', '\uD83D\uDCDD', 'Notes'],
    ['res', '\uD83D\uDD17', 'Links'],
    ['set', '\u2699\uFE0F', 'Settings']
  ];

  function buildNav() {
    if ($('.pwa-bottomnav')) return;
    var nav = document.createElement('nav');
    nav.className = 'pwa-bottomnav no-print';
    nav.setAttribute('aria-label', 'Main navigation');
    nav.innerHTML = NAV.map(function (t) {
      return '<button type="button" data-pwa-tab="' + t[0] + '" aria-label="' + t[2] + '">' +
             '<span class="i">' + t[1] + '</span><span class="l">' + t[2] + '</span></button>';
    }).join('');
    document.body.appendChild(nav);
    document.body.classList.add('pwa-nav');
    nav.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pwa-tab]');
      if (!b) return;
      try {
        window.VIEW = b.getAttribute('data-pwa-tab');
        if (typeof window.renderTabs === 'function') window.renderTabs();
        if (typeof window.render === 'function') window.render();
        window.scrollTo(0, 0);
      } catch (err) {}
      syncNav();
    });
    syncNav();
  }

  function syncNav() {
    var nav = $('.pwa-bottomnav');
    if (!nav) return;
    var cur = window.VIEW || 'dash';
    Array.prototype.forEach.call(nav.querySelectorAll('[data-pwa-tab]'), function (b) {
      b.classList.toggle('on', b.getAttribute('data-pwa-tab') === cur);
    });
  }

  function hookRenderTabs() {
    if (typeof window.renderTabs !== 'function' || window.renderTabs.__pwa) return false;
    var orig = window.renderTabs;
    var wrapped = function () { var r = orig.apply(this, arguments); try { syncNav(); } catch (e) {} return r; };
    wrapped.__pwa = true;
    window.renderTabs = wrapped;
    return true;
  }

  /* ---------- sheets ---------- */
  function sheet(id, html) {
    var old = document.getElementById(id);
    if (old) old.remove();
    var wrap = document.createElement('div');
    wrap.id = id;
    wrap.className = 'pwa-sheet-bg no-print';
    wrap.innerHTML = '<div class="pwa-sheet" role="dialog" aria-modal="true"><div class="pwa-sheet-grip"></div>' + html + '</div>';
    document.body.appendChild(wrap);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) wrap.remove(); });
    return wrap;
  }
  function closeSheet(id) { var el = document.getElementById(id); if (el) el.remove(); }

  /* ---------- in-app browser detection (WhatsApp / Instagram webview) ---------- */
  function isInAppBrowser() {
    var ua = navigator.userAgent || '';
    if (/(FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|MicroMessenger|Twitter|TikTok|Snapchat)/i.test(ua)) return true;
    if (isAndroid() && /; wv\)/i.test(ua)) return true;   /* Android WebView */
    return false;
  }
  function openInChrome() {
    var url = location.href.split('#')[0];
    if (isAndroid()) {
      location.href = 'intent://' + url.replace(/^https?:\/\//, '') +
                      '#Intent;scheme=https;package=com.android.chrome;end';
      return;
    }
    copyLink();
    toast('Link copied \u2014 paste it in Safari to install');
  }
  function inAppBanner() {
    if (!isInAppBrowser() || get('inappDismissed')) return;
    if (document.getElementById('pwa-inapp')) return;
    var b = document.createElement('div');
    b.id = 'pwa-inapp';
    b.className = 'pwa-banner pwa-inapp no-print';
    b.innerHTML =
      '<img src="./icons/icon-192.png" alt="" width="38" height="38">' +
      '<div class="pwa-banner-t"><b>Open this in Chrome to install</b>' +
      '<span>WhatsApp\u2019s browser cannot install apps \u2014 Chrome or Safari can.</span></div>' +
      '<button class="pwa-x" data-pwa="dismiss-inapp" aria-label="Dismiss">\u2715</button>' +
      '<button class="pwa-go" data-pwa="openchrome">Open</button>';
    document.body.appendChild(b);
    requestAnimationFrame(function () { b.classList.add('on'); });
  }

  /* ---------- install ---------- */
  var deferred = null;

  function installRowHTML(big) {
    if (standalone) {
      return '<div class="pwa-row"><b class="pwa-ok">\u2713 Installed</b>' +
             '<span class="pwa-mut">You are running the installed app.</span></div>';
    }
    var cls = 'btn pri pwa-btn' + (big ? ' pwa-btn-big' : '');
    if (deferred) {
      return '<button class="' + cls + '" data-pwa="install">\u2B07\uFE0F Install' + (big ? ' the app' : '') + '</button>' +
             '<span class="pwa-mut">One tap \u2014 adds the \u03C0 icon to your home screen.</span>';
    }
    if (isIOS()) {
      return '<button class="' + cls + '" data-pwa="ios">\u2B06\uFE0F Install on iPhone / iPad</button>' +
             '<span class="pwa-mut">Opens the 3-step Add to Home Screen guide.</span>';
    }
    if (isAndroid()) {
      return '<button class="' + cls + '" data-pwa="android">\u2753 Install on Android</button>' +
             '<span class="pwa-mut">Chrome menu \u22EE \u2192 \u201CInstall app\u201D / \u201CAdd to Home screen\u201D.</span>';
    }
    return '<button class="' + cls + '" data-pwa="help">\u2B07\uFE0F How to install</button>' +
           '<span class="pwa-mut">' + (location.protocol === 'file:'
             ? 'Needs the hosted link (or the included local server) to install.'
             : 'Browser menu \u2192 \u201CInstall app\u201D.') + '</span>';
  }

  function installCard() {
    var card = document.createElement('div');
    card.className = 'card pwa-install-card';
    card.id = 'pwa-install-card';
    card.innerHTML = '<h2>\uD83D\uDCF1 Install as a phone app</h2>' +
      '<p class="sub">A real installable app (PWA): home-screen icon, fullscreen, works with no internet. ' +
      'Your progress is saved on this device and installing does not reset it.</p>' +
      '<div class="pwa-row pwa-install-row">' + installRowHTML(false) + '</div>';
    return card;
  }

  function safetyCard() {
    var ps = persistStatus();
    var last = (window.S && window.S.lastBackup) ? window.S.lastBackup : null;
    var card = document.createElement('div');
    card.className = 'card pwa-safety-card';
    card.id = 'pwa-safety-card';
    card.innerHTML =
      '<h2>\uD83D\uDD12 Save my progress</h2>' +
      '<p class="sub">Ticks, notes, streaks and drill history are stored on this phone (offline storage) and saved after every change. ' +
      'A backup file is your safety net if you change phones or clear the browser.</p>' +
      '<div class="pwa-kv"><span>Storage protection</span><b>' + ps[0] + '</b></div>' +
      '<div class="pwa-kv"><span>Last backup</span><b>' + (last ? window.fmtDate(last) : 'never') + '</b></div>' +
      '<p class="pwa-mut" style="margin:6px 0 10px">' + ps[1] + '</p>' +
      '<div class="row">' +
        '<button class="btn pri" data-pwa="sharebackup">\uD83D\uDCE4 Share backup \u2192 Drive / WhatsApp</button>' +
        '<button class="btn" data-pwa="backup">\u2B07\uFE0F Download backup</button>' +
      '</div>' +
      '<div class="row" style="margin-top:10px">' +
        '<button class="btn ghost" data-pwa="sharelink">\uD83D\uDD17 Share this app</button>' +
        '<button class="btn ghost" data-pwa="copylink">\uD83D\uDCCB Copy app link</button>' +
        '<button class="btn ghost" data-pwa="checkupdate">\u21BB Check for updates</button>' +
      '</div>';
    return card;
  }

  function refreshInstall() {
    var row = $('#pwa-install-card .pwa-install-row');
    if (row) row.innerHTML = installRowHTML(false);
    var heroRow = $('#pwa-hero-card .pwa-install-row');
    if (heroRow) heroRow.innerHTML = installRowHTML(true);
  }

  function showInstallSheet() {
    var steps = isIOS()
      ? [['1', 'Tap the <b>Share</b> button (the square with an arrow) in Safari\u2019s toolbar.'],
         ['2', 'Scroll down, tap <b>Add to Home Screen</b>.'],
         ['3', 'Tap <b>Add</b>. The \u03C0 icon appears with your other apps \u2014 open it like any app.']]
      : [['1', 'Open the browser menu (\u22EE in Chrome, \u2261 in Firefox).'],
         ['2', 'Tap <b>Install app</b> or <b>Add to Home screen</b>.'],
         ['3', 'Confirm. The \u03C0 icon lands on your home screen and opens fullscreen.']];
    sheet('pwa-how', '<h3>Install \u03C0 on your phone</h3>' +
      '<ol class="pwa-steps">' + steps.map(function (s) { return '<li><b>' + s[0] + '.</b> ' + s[1] + '</li>'; }).join('') + '</ol>' +
      '<p class="pwa-note">Works offline once installed. Your progress stays on your phone \u2014 installing never touches it.</p>' +
      '<button class="btn pri pwa-btn" data-pwa="close">Got it</button>');
  }

  function offerInstall() {
    if (!deferred) { showInstallSheet(); return; }
    deferred.prompt();
    deferred.userChoice.then(function (res) {
      if (res && res.outcome === 'accepted') toast('Installing\u2026 \uD83C\uDF89');
      deferred = null;
      refreshInstall();
      closeSheet('pwa-install-banner');
      closeSheet('pwa-hero-install');
    }).catch(function () {});
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    refreshInstall();
    tryBanner();
  });
  window.addEventListener('appinstalled', function () {
    store('installed', '1');
    closeSheet('pwa-install-banner');
    removeHeroInstall();
    toast('Installed \uD83C\uDF89 Open \u03C0 from your home screen');
    refreshInstall();
  });

  /* the app's own install card should disappear once installed */
  function removeHeroInstall() {
    var h = document.getElementById('pwa-hero-install');
    if (h) h.remove();
  }

  /* ---------- install hero: first thing on the dashboard ---------- */
  function heroInstall() {
    if (standalone || get('installed') || get('heroDismissed')) return null;
    var app = document.getElementById('app');
    if (!app || !app.querySelector('.hero')) return null;         // dashboard only
    if (document.getElementById('pwa-hero-install')) return null;
    var box = document.createElement('div');
    box.id = 'pwa-hero-install';
    box.className = 'card pwa-hero-install no-print';
    box.innerHTML =
      '<div class="pwa-hero-top"><img src="./icons/icon-192.png" alt="" width="46" height="46">' +
        '<div><b>Install \u03C0 as an app</b><span>Fullscreen, works offline, keeps your progress on this phone.</span></div>' +
        '<button class="pwa-x" data-pwa="dismiss-hero" aria-label="Dismiss">\u2715</button></div>' +
      '<div class="pwa-row pwa-install-row">' + installRowHTML(true) + '</div>';
    app.insertBefore(box, app.firstChild);
    return box;
  }

  /* ---------- install banner (bottom, non-blocking) ---------- */
  function bannerBlocked() {
    if (standalone) return true;
    if (isInAppBrowser()) return true;      /* the in-app rescue banner handles this case */
    if (get('installed')) return true;
    if (get('bannerDismissed')) return true;
    if (!isPhone()) return true;
    var ob = document.getElementById('modal');
    if (ob && ob.classList.contains('on')) return true;      // onboarding is open
    if (document.getElementById('pwa-install-banner')) return true;
    return false;
  }

  function tryBanner() {
    if (bannerBlocked()) return;
    if (!deferred && !isIOS()) return;
    var b = document.createElement('div');
    b.id = 'pwa-install-banner';
    b.className = 'pwa-banner no-print';
    b.innerHTML =
      '<img src="./icons/icon-192.png" alt="" width="38" height="38">' +
      '<div class="pwa-banner-t"><b>Add \u03C0 to your home screen</b><span>One tap \u2014 then it opens like any app, even offline.</span></div>' +
      '<button class="pwa-x" data-pwa="dismiss-banner" aria-label="Dismiss">\u2715</button>' +
      '<button class="pwa-go" data-pwa="install">' + (isIOS() ? 'How' : 'Install') + '</button>';
    document.body.appendChild(b);
    requestAnimationFrame(function () { b.classList.add('on'); });
  }

  /* ---------- onboarding: put install in front of the user ---------- */
  function hookOnboarding() {
    var i = document.getElementById('modal-in');
    var m = document.getElementById('modal');
    if (!i || !m || !m.classList.contains('on')) return;
    if (i.querySelector('#pwa-onb-install')) return;
    var row = document.createElement('div');
    row.id = 'pwa-onb-install';
    row.className = 'pwa-onb-install';
    row.innerHTML = '<div class="pwa-row pwa-install-row">' + installRowHTML(true) + '</div>';
    i.appendChild(row);
  }

  /* ---------- settings injection ---------- */
  function injectInto(container) {
    if (container.querySelector('#pwa-install-card')) { refreshInstall(); return; }
    container.appendChild(installCard());
    container.appendChild(safetyCard());
  }

  var moTimer = null;
  function scanViews() {
    heroInstall();
    hookOnboarding();
    var app = document.getElementById('app');
    if (!app) return;
    if (document.getElementById('pwa-install-card')) { refreshInstall(); return; }
    if (/Settings & (amp;)?your data/.test(app.textContent)) injectInto(app);
  }
  var mo = new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      var t = records[i].target;
      if (t && t.closest && (t.closest('.pwa-bottomnav') || t.closest('#pwa-install-card') || t.closest('#pwa-hero-install'))) continue;
      clearTimeout(moTimer);
      moTimer = setTimeout(scanViews, 200);
      return;
    }
  });

  /* ---------- clicks ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-pwa]');
    if (!el) return;
    var act = el.getAttribute('data-pwa');
    if (act === 'install') offerInstall();
    else if (act === 'openchrome') openInChrome();
    else if (act === 'dismiss-inapp') { store('inappDismissed', '1'); var ib = document.getElementById('pwa-inapp'); if (ib) ib.remove(); }
    else if (act === 'ios' || act === 'android' || act === 'help') showInstallSheet();
    else if (act === 'close') closeSheet('pwa-how');
    else if (act === 'backup') saveBackupFile();
    else if (act === 'sharebackup') shareBackup();
    else if (act === 'copylink') copyLink();
    else if (act === 'sharelink') shareLink();
    else if (act === 'checkupdate') checkForUpdates();
    else if (act === 'dismiss-banner') { store('bannerDismissed', '1'); closeSheet('pwa-install-banner'); }
    else if (act === 'dismiss-hero') { store('heroDismissed', '1'); removeHeroInstall(); }
  });

  /* ---------- home-screen shortcuts: ?go=plan / ?go=drill / ?go=road ---------- */
  function applyDeepLink() {
    var want = null;
    try { var p = new URLSearchParams(location.search); want = p.get('go') || p.get('tab'); } catch (e) {}
    if (!want) return false;
    if (!NAV.some(function (t) { return t[0] === want; })) return false;
    try {
      window.VIEW = want;
      if (typeof window.renderTabs === 'function') window.renderTabs();
      if (typeof window.render === 'function') window.render();
    } catch (e) { return false; }
    syncNav();
    return true;
  }

  /* ---------- boot ---------- */
  function boot() {
    buildNav();
    try { inAppBanner(); } catch (e) {}
    applyDeepLink();
    try { registerSW(); } catch (e) {}
    try { requestPersistence(); } catch (e) {}
    hookRenderTabs();
    scanViews();
    mo.observe(document.body, { childList: true, subtree: true });

    /* the install ask: hero immediately, banner as soon as onboarding is out of the way */
    setTimeout(scanViews, 600);
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      scanViews();
      tryBanner();
      if ((deferred || isIOS()) && tries > 40) clearInterval(t);   // ~1 min of trying, then stop
    }, 1500);

    setInterval(syncNav, 1500);
    setInterval(scanViews, 4000);

    window.addEventListener('online', function () { toast('\u2713 Back online'); });
    window.addEventListener('offline', function () { toast('\u2708\uFE0F Offline \u2014 the app keeps working'); });

    /* belt-and-braces save when the app goes to the background (phones kill tabs) */
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') { try { window.save && window.save(); } catch (e) {} }
    });
  }

  var build = document.querySelector('meta[name="app-build"]');
  if (build) console.log('Math Hero app build ' + build.getAttribute('content'));

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
