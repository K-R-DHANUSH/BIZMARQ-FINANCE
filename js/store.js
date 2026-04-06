// ═══════════════════════════════════════════════════════════════
//  NEXUS — Central Data Store (FINAL FIXED VERSION)
//  Backend: Cloudflare Worker → GitHub Gist
// ═══════════════════════════════════════════════════════════════

// ✅ Worker URL (YOUR BACKEND)
const WORKER_URL = 'https://gitnexus.dhanushkrd02.workers.dev';

// ─── Seed / Default Data ──────────────────────────────────────
const defaults = {
  users: [],
  projects: [],
  tasks: [],
  meetings: [],
  files: [],
  folders: [],
  messages: [],
  notifications: [],
  company: {},
  divisions: [],
  departments: []
};

// ═══════════════════════════════════════════════════════════════
//  Store — Worker-based backend (NO TOKENS IN FRONTEND)
// ═══════════════════════════════════════════════════════════════
const Store = (() => {
  const LS_KEY   = 'nexus_data';
  const LS_DIRTY = 'nexus_dirty';

  let _cache     = null;
  let _syncTimer = null;

  // ── localStorage helpers ─────────────────────
  const lsRead  = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)); } catch { return null; } };
  const lsWrite = (d) => { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch (e) { console.warn('LS write failed', e); } };

  // ─────────────────────────────────────────────
  // 🔵 READ FROM WORKER
  // ─────────────────────────────────────────────
  async function fetchData() {
    const res = await fetch(WORKER_URL, { method: 'GET' });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Worker read failed: ${res.status} — ${err}`);
    }

    return res.json();
  }

  // ─────────────────────────────────────────────
  // 🟢 WRITE TO WORKER
  // ─────────────────────────────────────────────
  async function saveData(data) {
    const res = await fetch(WORKER_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Worker write failed: ${res.status} — ${err}`);
    }

    return res.json();
  }

  // ── Init ─────────────────────────────────────
  async function init() {
    try {
      showSyncIndicator('syncing');

      const remote = await fetchData();

      if (!remote || !remote.users) {
        await saveData(defaults);
        _cache = JSON.parse(JSON.stringify(defaults));
      } else {
        _cache = remote;
      }

      lsWrite(_cache);
      showSyncIndicator('ok');
      return _cache;

    } catch (err) {
      console.warn('Worker error:', err.message);
      showSyncIndicator('error');

      const local = lsRead();
      if (!local) {
        _cache = JSON.parse(JSON.stringify(defaults));
        lsWrite(_cache);
      } else {
        _cache = local;
      }

      return _cache;
    }
  }

  // ── Debounced sync ───────────────────────────
  function schedulePush() {
    localStorage.setItem(LS_DIRTY, '1');
    if (_syncTimer) clearTimeout(_syncTimer);
    _syncTimer = setTimeout(pushToRemote, 800);
  }

  async function pushToRemote() {
    if (!_cache) return;

    try {
      showSyncIndicator('syncing');
      await saveData(_cache);
      localStorage.removeItem(LS_DIRTY);
      showSyncIndicator('ok');
    } catch (err) {
      console.warn('Push failed:', err.message);
      showSyncIndicator('error');
    }
  }

  // ── Indicator UI ─────────────────────────────
  function showSyncIndicator(state) {
    const el = document.getElementById('sync-indicator');
    if (!el) return;

    const map = {
      syncing: { text: '⟳ Syncing…', color: 'orange' },
      ok:      { text: '✓ Cloud Synced', color: 'green' },
      error:   { text: '⚠ Sync Error', color: 'red' }
    };

    const s = map[state];
    if (!s) return;

    el.textContent = s.text;
    el.style.color = s.color;
  }

  // ── Public API ───────────────────────────────
  function get() {
    if (_cache) return _cache;
    const local = lsRead();
    _cache = local || JSON.parse(JSON.stringify(defaults));
    return _cache;
  }

  function set(updater) {
    const data    = get();
    const updated = updater(JSON.parse(JSON.stringify(data)));
    _cache = updated;
    lsWrite(updated);
    schedulePush();
    return updated;
  }

  async function reset() {
    _cache = JSON.parse(JSON.stringify(defaults));
    lsWrite(_cache);
    await saveData(_cache);
    return _cache;
  }

  return { get, set, reset, init };
})();

// ─── Auth ─────────────────────────────────────
const Auth = (() => {
  const SESSION_KEY = 'nexus_session';

  function login(username, password) {
    const data = Store.get();
    const user = data.users.find(u => u.username === username && u.password === password && u.active);
    if (!user) return null;

    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      userId: user.id,
      loginAt: new Date().toISOString()
    }));

    return user;
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
  }

  function current() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const { userId } = JSON.parse(raw);
    return Store.get().users.find(u => u.id === userId) || null;
  }

  function requireAuth() {
    const user = current();
    if (!user) {
      window.location.href = 'index.html';
      return null;
    }
    return user;
  }

  return { login, logout, current, requireAuth };
})();
