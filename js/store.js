// ═══════════════════════════════════════════════════════════════
//  NEXUS — Central Data Store (FINAL STABLE)
//  Backend: Cloudflare Worker → GitHub Gist
// ═══════════════════════════════════════════════════════════════

// ✅ Your Worker URL
const WORKER_URL = 'https://gitnexus.dhanushkrd02.workers.dev';

// ─── Default Data ─────────────────────────────────────────────
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
//  Store — Worker-based backend
// ═══════════════════════════════════════════════════════════════
const Store = (() => {
  const LS_KEY = 'nexus_data';

  let _cache = null;
  let _syncTimer = null;

  const lsRead = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)); }
    catch { return null; }
  };

  const lsWrite = (d) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(d)); }
    catch (e) { console.warn('LS write failed', e); }
  };

  // 🔵 READ
  async function fetchData() {
    const res = await fetch(WORKER_URL);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Worker read failed: ${res.status} — ${err}`);
    }

    return res.json();
  }

  // 🟢 WRITE
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

  // INIT
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
      console.warn(err.message);
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

  // AUTO SYNC
  function schedulePush() {
    if (_syncTimer) clearTimeout(_syncTimer);
    _syncTimer = setTimeout(push, 800);
  }

  async function push() {
    if (!_cache) return;

    try {
      showSyncIndicator('syncing');
      await saveData(_cache);
      showSyncIndicator('ok');
    } catch (e) {
      console.warn(e.message);
      showSyncIndicator('error');
    }
  }

  // INDICATOR
  function showSyncIndicator(state) {
    const el = document.getElementById('sync-indicator');
    if (!el) return;

    const map = {
      syncing: { text: '⟳ Syncing…', color: 'orange' },
      ok:      { text: '✓ Synced', color: 'green' },
      error:   { text: '⚠ Error', color: 'red' }
    };

    const s = map[state];
    if (!s) return;

    el.textContent = s.text;
    el.style.color = s.color;
  }

  // PUBLIC API
  function get() {
    if (_cache) return _cache;
    const local = lsRead();
    _cache = local || JSON.parse(JSON.stringify(defaults));
    return _cache;
  }

  function set(updater) {
    const data = get();
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
  const KEY = 'nexus_session';

  function login(username, password) {
    const user = Store.get().users.find(
      u => u.username === username && u.password === password && u.active
    );

    if (!user) return null;

    sessionStorage.setItem(KEY, JSON.stringify({
      userId: user.id
    }));

    return user;
  }

  function logout() {
    sessionStorage.removeItem(KEY);
    window.location.href = 'index.html';
  }

  function current() {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;

    const { userId } = JSON.parse(raw);
    return Store.get().users.find(u => u.id === userId);
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

// ─── Helper (FIXES YOUR ERROR) ─────────────────
const H = {
  notify: (msg, type = 'info') => {
    const container = document.getElementById('toast-container');

    if (!container) {
      console.log(`[${type}]`, msg);
      return;
    }

    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;

    container.appendChild(t);

    setTimeout(() => t.classList.add('show'), 10);

    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 400);
    }, 3000);
  }
};
