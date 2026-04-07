// ═══════════════════════════════════════════════════════════════
//  NEXUS — Central Data Store v4
//  Backend : Cloudflare Worker → GitHub Gist  (token stays server-side)
//  Fallback : localStorage  (offline / unconfigured)
// ═══════════════════════════════════════════════════════════════
//
//  ┌─── ONE-TIME SETUP (takes ~3 minutes) ──────────────────────┐
//  │                                                            │
//  │  1. Deploy cloudflare-worker.js to workers.cloudflare.com  │
//  │     → Create Worker → paste the worker code → Deploy       │
//  │     → Settings → Variables & Secrets → Add Secret:         │
//  │       Name: GIST_TOKEN   Value: ghp_yourtoken              │
//  │     → Note your worker URL (e.g. nexus.yourname.workers.dev)│
//  │                                                            │
//  │  2. Generate a NEW GitHub Classic token:                   │
//  │     github.com/settings/tokens/new                         │
//  │     → Note: "Nexus App" · Scope: gist only · No expiration │
//  │     → Paste ONLY into Cloudflare secret — NEVER here       │
//  │                                                            │
//  │  3. Paste your Worker URL below ↓                          │
//  └────────────────────────────────────────────────────────────┘



// ─── Worker Config ─────────────────────────────────────────────
// Set this to your deployed Cloudflare Worker URL.
// The token lives in Cloudflare as a secret — it is NEVER stored here.
// localStorage('nexus_worker_url') overrides this (set via Settings UI).
const WORKER_URL = 'https://gitnexus.dhanushkrd02.workers.dev/';   // ← e.g. 'https://nexus-proxy.yourname.workers.dev'

function getWorkerUrl() {
  return localStorage.getItem('nexus_worker_url') || WORKER_URL || '';
}

const isConfigured = () => !!getWorkerUrl();



// ─── Seed / Default Data ──────────────────────────────────────
const defaults = {
  users: [
    {
      id: 'sa_001', username: 'admin.root', password: 'Admin@123',
      name: 'Alexandra Reed', role: 'super_admin', email: 'alexandra@nexus.co',
      avatar: 'AR', department: 'Executive', position: 'Chief Executive Officer',
      division: 'Corporate', managerId: null, active: true,
      createdAt: '2024-01-01', phone: '+1 555 0001'
    },
    {
      id: 'sa_002', username: 'admin.ops', password: 'Admin@456',
      name: 'Marcus Chen', role: 'super_admin', email: 'marcus@nexus.co',
      avatar: 'MC', department: 'Operations', position: 'Chief Operations Officer',
      division: 'Corporate', managerId: 'sa_001', active: true,
      createdAt: '2024-01-01', phone: '+1 555 0002'
    },
    {
      id: 'sa_003', username: 'admin.tech', password: 'Admin@789',
      name: 'Priya Nair', role: 'super_admin', email: 'priya@nexus.co',
      avatar: 'PN', department: 'Technology', position: 'Chief Technology Officer',
      division: 'Corporate', managerId: 'sa_001', active: true,
      createdAt: '2024-01-01', phone: '+1 555 0003'
    },
    {
      id: 'mgr_001', username: 'james.wilson', password: 'Pass@123',
      name: 'James Wilson', role: 'manager', email: 'james@nexus.co',
      avatar: 'JW', department: 'Engineering', position: 'Engineering Manager',
      division: 'Technology', managerId: 'sa_003', active: true,
      createdAt: '2024-02-01', phone: '+1 555 0010'
    },
    {
      id: 'mgr_002', username: 'sofia.martinez', password: 'Pass@456',
      name: 'Sofia Martinez', role: 'manager', email: 'sofia@nexus.co',
      avatar: 'SM', department: 'Design', position: 'Design Lead',
      division: 'Technology', managerId: 'sa_003', active: true,
      createdAt: '2024-02-01', phone: '+1 555 0011'
    },
    {
      id: 'emp_001', username: 'kai.johnson', password: 'Pass@111',
      name: 'Kai Johnson', role: 'employee', email: 'kai@nexus.co',
      avatar: 'KJ', department: 'Engineering', position: 'Senior Developer',
      division: 'Technology', managerId: 'mgr_001', active: true,
      createdAt: '2024-03-01', phone: '+1 555 0020'
    },
    {
      id: 'emp_002', username: 'luna.patel', password: 'Pass@222',
      name: 'Luna Patel', role: 'employee', email: 'luna@nexus.co',
      avatar: 'LP', department: 'Engineering', position: 'Frontend Developer',
      division: 'Technology', managerId: 'mgr_001', active: true,
      createdAt: '2024-03-01', phone: '+1 555 0021'
    },
    {
      id: 'emp_003', username: 'noah.kim', password: 'Pass@333',
      name: 'Noah Kim', role: 'employee', email: 'noah@nexus.co',
      avatar: 'NK', department: 'Design', position: 'UX Designer',
      division: 'Technology', managerId: 'mgr_002', active: true,
      createdAt: '2024-03-01', phone: '+1 555 0022'
    }
  ],
  projects: [
    {
      id: 'proj_001', name: 'Nexus Platform Redesign', code: 'NPR-2025',
      description: 'Complete overhaul of the internal platform UI/UX and backend systems.',
      status: 'active', priority: 'high',
      startDate: '2025-01-15', endDate: '2025-06-30',
      managerId: 'mgr_001', teamIds: ['emp_001', 'emp_002', 'emp_003'],
      createdBy: 'sa_001', createdAt: '2025-01-10',
      objectives: ['Modernize UI', 'Improve performance', 'Add new features'],
      completion: 45
    },
    {
      id: 'proj_002', name: 'Mobile App Launch', code: 'MAL-2025',
      description: 'Develop and launch the Nexus mobile application for iOS and Android.',
      status: 'planning', priority: 'medium',
      startDate: '2025-03-01', endDate: '2025-09-30',
      managerId: 'mgr_002', teamIds: ['emp_001', 'emp_003'],
      createdBy: 'sa_002', createdAt: '2025-02-01',
      objectives: ['iOS app', 'Android app', 'Beta testing'],
      completion: 15
    },
    {
      id: 'proj_003', name: 'Data Analytics Dashboard', code: 'DAD-2025',
      description: 'Build comprehensive analytics and reporting dashboard.',
      status: 'completed', priority: 'low',
      startDate: '2024-10-01', endDate: '2025-02-28',
      managerId: 'mgr_001', teamIds: ['emp_001', 'emp_002'],
      createdBy: 'sa_003', createdAt: '2024-09-15',
      objectives: ['Data pipeline', 'Visualization layer', 'Export tools'],
      completion: 100
    }
  ],
  tasks: [
    {
      id: 'task_001', title: 'Redesign Login Page', projectId: 'proj_001',
      description: 'Create new login page with SSO support and modern design.',
      assignedTo: 'emp_002', createdBy: 'mgr_001',
      priority: 'high', status: 'in_progress',
      startDate: '2025-03-01', dueDate: '2025-03-15',
      completedAt: null, reportingManagerId: 'mgr_001',
      tags: ['design', 'frontend'], createdAt: '2025-02-28'
    },
    {
      id: 'task_002', title: 'API Integration for Auth Module', projectId: 'proj_001',
      description: 'Integrate OAuth 2.0 and SAML authentication providers.',
      assignedTo: 'emp_001', createdBy: 'mgr_001',
      priority: 'critical', status: 'in_progress',
      startDate: '2025-03-01', dueDate: '2025-03-20',
      completedAt: null, reportingManagerId: 'mgr_001',
      tags: ['backend', 'auth'], createdAt: '2025-02-28'
    },
    {
      id: 'task_003', title: 'User Journey Mapping', projectId: 'proj_002',
      description: 'Map all user journeys for the mobile app flows.',
      assignedTo: 'emp_003', createdBy: 'mgr_002',
      priority: 'medium', status: 'todo',
      startDate: '2025-03-10', dueDate: '2025-03-25',
      completedAt: null, reportingManagerId: 'mgr_002',
      tags: ['ux', 'research'], createdAt: '2025-03-05'
    },
    {
      id: 'task_004', title: 'Database Schema Design', projectId: 'proj_001',
      description: 'Design and document the complete database schema.',
      assignedTo: 'emp_001', createdBy: 'mgr_001',
      priority: 'high', status: 'completed',
      startDate: '2025-02-01', dueDate: '2025-02-15',
      completedAt: '2025-02-14', reportingManagerId: 'mgr_001',
      tags: ['backend', 'database'], createdAt: '2025-01-28'
    }
  ],
  meetings: [
    {
      id: 'meet_001', title: 'Sprint Planning Q1', date: '2025-03-10',
      time: '10:00', duration: 60, organizer: 'mgr_001',
      attendees: ['emp_001', 'emp_002', 'emp_003'],
      gmeetLink: 'https://meet.google.com/abc-defg-hij',
      description: 'Q1 sprint planning and task assignment.'
    },
    {
      id: 'meet_002', title: 'Design Review', date: '2025-03-12',
      time: '14:00', duration: 45, organizer: 'mgr_002',
      attendees: ['emp_003', 'emp_002'],
      gmeetLink: 'https://meet.google.com/xyz-uvwx-stu',
      description: 'Review of mobile app design mockups.'
    }
  ],
  files: [
    {
      id: 'file_001', name: 'Brand Guidelines 2025.pdf', type: 'pdf',
      size: '4.2 MB', folderId: 'folder_001',
      uploadedBy: 'mgr_002', uploadedAt: '2025-02-15',
      permissions: ['all'], url: '#', shared: true
    },
    {
      id: 'file_002', name: 'Q1 Sprint Plan.xlsx', type: 'xlsx',
      size: '1.1 MB', folderId: 'folder_002',
      uploadedBy: 'mgr_001', uploadedAt: '2025-03-01',
      permissions: ['mgr_001', 'emp_001', 'emp_002'], url: '#', shared: false
    },
    {
      id: 'file_003', name: 'API Documentation v2.pdf', type: 'pdf',
      size: '2.8 MB', folderId: 'folder_002',
      uploadedBy: 'emp_001', uploadedAt: '2025-03-05',
      permissions: ['all'], url: '#', shared: true
    }
  ],
  folders: [
    { id: 'folder_001', name: 'Brand & Marketing', parentId: null, createdBy: 'sa_001', permissions: ['all'] },
    { id: 'folder_002', name: 'Engineering', parentId: null, createdBy: 'sa_003', permissions: ['mgr_001', 'emp_001', 'emp_002'] },
    { id: 'folder_003', name: 'Design Assets', parentId: null, createdBy: 'mgr_002', permissions: ['all'] }
  ],
  messages: [
    {
      id: 'msg_001', type: 'private', from: 'emp_001', to: 'emp_002',
      text: 'Hey Luna, can you review the login page PR?', time: '2025-03-08T09:30:00', read: true
    },
    {
      id: 'msg_002', type: 'private', from: 'emp_002', to: 'emp_001',
      text: 'Sure Kai! Will check it by EOD.', time: '2025-03-08T09:35:00', read: true
    },
    {
      id: 'msg_003', type: 'public', from: 'sa_001', to: null,
      text: '📢 All teams: Q1 performance reviews start next week. Please complete your self-assessments by Friday.',
      time: '2025-03-08T10:00:00', read: false
    },
    {
      id: 'msg_004', type: 'public', from: 'mgr_001', to: null,
      text: '🚀 Great news! The analytics dashboard project has been marked complete. Congrats to the engineering team!',
      time: '2025-03-09T11:00:00', read: false
    }
  ],
  notifications: [],
  company: {
    name: 'Nexus Corporation',
    tagline: 'Building Tomorrow, Together.',
    mission: 'To empower organizations with intelligent tools that transform how teams collaborate, execute, and achieve their highest potential.',
    vision: 'A world where every team operates at peak performance through seamless technology integration.',
    values: ['Innovation', 'Integrity', 'Collaboration', 'Excellence', 'Inclusion'],
    founded: '2019',
    employees: 8,
    logo: '⬡'
  },
  divisions: [
    { id: 'div_001', name: 'Corporate', description: 'Executive & Leadership' },
    { id: 'div_002', name: 'Technology', description: 'Engineering, Design & Product' },
    { id: 'div_003', name: 'Operations', description: 'HR, Finance & Facilities' }
  ],
  departments: [
    { id: 'dept_001', name: 'Executive', divisionId: 'div_001' },
    { id: 'dept_002', name: 'Operations', divisionId: 'div_001' },
    { id: 'dept_003', name: 'Engineering', divisionId: 'div_002' },
    { id: 'dept_004', name: 'Design', divisionId: 'div_002' },
    { id: 'dept_005', name: 'Product', divisionId: 'div_002' },
    { id: 'dept_006', name: 'Human Resources', divisionId: 'div_003' },
    { id: 'dept_007', name: 'Finance', divisionId: 'div_003' }
  ]
};



// ═══════════════════════════════════════════════════════════════
//  Store  —  Cloudflare Worker → GitHub Gist backend
// ═══════════════════════════════════════════════════════════════
const Store = (() => {
  const LS_KEY   = 'nexus_data';
  const LS_DIRTY = 'nexus_dirty';

  let _cache     = null;
  let _syncTimer = null;



  // ── localStorage helpers ─────────────────────
  const lsRead  = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)); } catch { return null; } };
  const lsWrite = (d) => { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch (e) { console.warn('LS write failed', e); } };



  // ── Worker API ───────────────────────────────
  // All reads/writes go through the Cloudflare Worker.
  // The GitHub token never touches the browser.

  async function workerRead() {
    const url = getWorkerUrl();
    if (!url) throw new Error('Worker URL not configured');
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) throw new Error(`Gist read failed: ${res.status} ${res.statusText}`);
    const data = await res.json();
    // If the gist is empty ({}) treat as uninitialized
    if (!data || !data.users) return null;
    return data;
  }



  async function workerWrite(data) {
    const url = getWorkerUrl();
    if (!url) throw new Error('Worker URL not configured');
    const res = await fetch(url, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data)
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gist write failed: ${res.status} — ${body}`);
    }
    return res.json();
  }



  // ── Init / Load ──────────────────────────────
  async function init() {
    if (isConfigured()) {
      try {
        showSyncIndicator('syncing');
        const remote = await workerRead();
        if (!remote) {
          // First run — push seed data up to Gist via worker
          await workerWrite(defaults);
          _cache = JSON.parse(JSON.stringify(defaults));
          lsWrite(_cache);
        } else {
          // Use Gist as source of truth
          _cache = remote;
          lsWrite(_cache);
        }
        showSyncIndicator('ok');
        return _cache;
      } catch (err) {
        console.warn('Worker/Gist error:', err.message);
        showSyncIndicator('error');
        H.notify('⚠ Could not reach cloud — showing cached data. Check your Worker URL.', 'error');
      }
    } else {
      showSyncIndicator('local');
    }

    // Fallback: localStorage (only reached if worker is unconfigured or failed)
    const local = lsRead();
    if (!local) {
      lsWrite(defaults);
      _cache = JSON.parse(JSON.stringify(defaults));
    } else {
      _cache = local;
    }
    return _cache;
  }



  // ── Debounced push (800 ms after last write) ─
  function schedulePush() {
    localStorage.setItem(LS_DIRTY, '1');
    if (_syncTimer) clearTimeout(_syncTimer);
    _syncTimer = setTimeout(pushToRemote, 800);
  }



  async function pushToRemote() {
    if (!isConfigured() || !_cache) return;
    try {
      showSyncIndicator('syncing');
      await workerWrite(_cache);
      localStorage.removeItem(LS_DIRTY);
      showSyncIndicator('ok');
    } catch (err) {
      console.warn('Worker push failed:', err.message);
      showSyncIndicator('error');
    }
  }



  // ── Sync indicator in header ─────────────────
  function showSyncIndicator(state) {
    const el = document.getElementById('sync-indicator');
    if (!el) return;
    const map = {
      syncing: { text: '⟳ Syncing…',      color: 'var(--warn)',    title: 'Saving to cloud…' },
      ok:      { text: '✓ Cloud Synced',   color: 'var(--success)', title: 'All changes saved — click to manage' },
      error:   { text: '⚠ Sync Error',    color: 'var(--danger)',  title: 'Sync failed — click to reconfigure' },
      local:   { text: '⚠ Local Only — Click to Connect Cloud', color: 'var(--warn)', title: 'No Worker URL configured — click to set up cloud sync' }
    };
    const s = map[state] || map.local;
    el.textContent  = s.text;
    el.style.color  = s.color;
    el.title        = s.title;
    el.style.cursor = 'pointer';
    el.onclick      = () => showGistSetupModal();
  }



  // ── Full-screen setup modal ──────────────────
  function showGistSetupModal() {
    document.getElementById('gist-setup-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'gist-setup-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.6);
      display:flex;align-items:center;justify-content:center;padding:24px;
      backdrop-filter:blur(4px);
    `;

    const connected = isConfigured();
    overlay.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--border-2);border-radius:16px;padding:32px;max-width:540px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,.4);position:relative">
        <button onclick="document.getElementById('gist-setup-overlay').remove()" style="position:absolute;top:16px;right:16px;color:var(--text-3);font-size:18px;cursor:pointer;line-height:1">✕</button>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
          <span style="font-size:28px">☁️</span>
          <h2 style="font-size:20px;font-weight:800;font-family:var(--font-head)">Connect Cloud Storage</h2>
        </div>
        <p style="font-size:13px;color:var(--text-2);margin-bottom:24px;line-height:1.7">
          Nexus uses a <strong>Cloudflare Worker</strong> as a secure proxy to GitHub Gist.
          Your GitHub token is stored only in Cloudflare — it never touches this page.<br><br>
          Setup takes ~3 minutes. You need a free Cloudflare account and a free GitHub account.
        </p>

        <div style="background:var(--bg-surface);border-radius:12px;padding:16px;margin-bottom:20px;font-size:12px;color:var(--text-2);line-height:1.9">
          <strong style="color:var(--text-1)">Quick setup:</strong><br>
          1. Deploy <code style="background:var(--bg-hover);padding:1px 5px;border-radius:4px">cloudflare-worker.js</code> at
             <a href="https://workers.cloudflare.com" target="_blank" style="color:var(--accent)">workers.cloudflare.com</a><br>
          &nbsp;&nbsp;&nbsp;→ Worker Settings → Variables &amp; Secrets → add secret <strong>GIST_TOKEN</strong><br>
          2. Generate a Classic GitHub token at
             <a href="https://github.com/settings/tokens/new" target="_blank" style="color:var(--accent)">github.com/settings/tokens/new</a><br>
          &nbsp;&nbsp;&nbsp;→ Scope: ✅ <strong>gist</strong> only · paste it as the Cloudflare secret<br>
          3. Paste your Worker URL below ↓
        </div>

        <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px">
          <div>
            <label style="font-size:12px;font-weight:600;color:var(--text-2);display:block;margin-bottom:6px">CLOUDFLARE WORKER URL</label>
            <input type="text" id="gist-modal-url" placeholder="https://nexus-proxy.yourname.workers.dev" value="${getWorkerUrl()}"
              style="width:100%;font-family:monospace;font-size:13px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-base);color:var(--text-1)">
          </div>
        </div>

        <div id="gist-modal-msg" style="font-size:12px;min-height:18px;margin-bottom:12px"></div>

        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button id="gist-modal-save-btn" onclick="Store._saveGistConfigFromModal()" style="flex:1;padding:12px;background:var(--accent);color:#fff;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;border:none">
            ☁️ Save & Connect
          </button>
          <button onclick="document.getElementById('gist-setup-overlay').remove()" style="padding:12px 20px;background:var(--bg-hover);color:var(--text-2);border-radius:8px;font-size:13px;cursor:pointer;border:1px solid var(--border)">
            Skip for now
          </button>
          ${connected ? `<button onclick="Store._clearGistConfig()" style="padding:12px 20px;background:transparent;color:var(--danger);border:1px solid var(--danger);border-radius:8px;font-size:13px;cursor:pointer">Disconnect</button>` : ''}
        </div>
        ${!connected ? `<p style="font-size:11px;color:var(--text-3);margin-top:12px;text-align:center">Data will only be stored locally in this browser until you connect.</p>` : ''}
      </div>
    `;
    document.body.appendChild(overlay);

    const urlEl = document.getElementById('gist-modal-url');
    if (urlEl) {
      urlEl.focus();
      urlEl.addEventListener('keydown', e => {
        if (e.key === 'Enter') Store._saveGistConfigFromModal();
      });
    }
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
    lsWrite(updated);   // instant local write
    schedulePush();     // async push (debounced)
    return updated;
  }



  async function reset() {
    _cache = JSON.parse(JSON.stringify(defaults));
    lsWrite(_cache);
    if (isConfigured()) await workerWrite(_cache);
    return _cache;
  }



  // ── Settings UI widget ───────────────────────
  function renderSettingsWidget(containerEl) {
    if (!containerEl) return;
    const connected = isConfigured();
    containerEl.setAttribute('data-gist-widget', '1');
    containerEl.innerHTML = `
      <div class="card" style="max-width:520px">
        <div class="card-header" style="display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">⬡</span>
          <div>
            <div style="font-weight:700;font-size:15px">Cloud Storage</div>
            <div style="font-size:12px;color:var(--text-3)">Cloudflare Worker → GitHub Gist backend</div>
          </div>
          <span style="margin-left:auto;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;background:${connected ? 'var(--success-bg,#1a3a2a)' : 'var(--bg-hover)'};color:${connected ? 'var(--success)' : 'var(--text-3)'}">
            ${connected ? '✓ Connected' : '◌ Not connected'}
          </span>
        </div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:12px;padding:18px">
          <div class="form-group">
            <label>Cloudflare Worker URL</label>
            <input type="text" id="cfg-worker-url" placeholder="https://nexus-proxy.yourname.workers.dev" value="${getWorkerUrl()}"
              style="font-family:monospace;font-size:13px">
            <div style="font-size:11px;color:var(--text-3);margin-top:4px">
              Deploy <code>cloudflare-worker.js</code> and paste the worker URL here. The GitHub token stays in Cloudflare — never in this file.
            </div>
          </div>
          <div id="gist-cfg-msg" style="font-size:12px;min-height:16px"></div>
          <div style="display:flex;gap:10px">
            <button class="btn btn-primary" onclick="Store._saveGistConfig()">Save & Connect</button>
            ${connected ? `<button class="btn btn-ghost" onclick="Store._testGistConnection()">Test Connection</button>` : ''}
            ${connected ? `<button class="btn btn-ghost" onclick="Store._clearGistConfig()" style="margin-left:auto;color:var(--danger)">Disconnect</button>` : ''}
          </div>
        </div>
      </div>`;
  }



  // ── Settings widget button handlers ──────────
  async function _saveGistConfig() {
    const url = document.getElementById('cfg-worker-url')?.value.trim();
    const msg = document.getElementById('gist-cfg-msg');
    if (!url) { if (msg) msg.innerHTML = '<span style="color:var(--danger)">Worker URL is required.</span>'; return; }
    localStorage.setItem('nexus_worker_url', url);
    if (msg) msg.innerHTML = '<span style="color:var(--warn)">⟳ Testing connection…</span>';
    try {
      showSyncIndicator('syncing');
      const remote = await workerRead();
      if (!remote) {
        await workerWrite(_cache || defaults);
        if (_cache === null) _cache = JSON.parse(JSON.stringify(defaults));
      } else {
        _cache = remote;
        lsWrite(_cache);
      }
      showSyncIndicator('ok');
      if (msg) msg.innerHTML = '<span style="color:var(--success)">✓ Connected successfully! Data synced from Gist.</span>';
      H.notify('Cloud storage connected!', 'success');
    } catch (err) {
      showSyncIndicator('error');
      if (msg) msg.innerHTML = `<span style="color:var(--danger)">✗ ${err.message}</span>`;
      H.notify('Connection failed — check your Worker URL', 'error');
    }
  }



  async function _testGistConnection() {
    const msg = document.getElementById('gist-cfg-msg');
    try {
      if (msg) msg.innerHTML = '<span style="color:var(--warn)">⟳ Testing…</span>';
      showSyncIndicator('syncing');
      await workerRead();
      showSyncIndicator('ok');
      if (msg) msg.innerHTML = '<span style="color:var(--success)">✓ Connection OK — Worker is reachable.</span>';
      H.notify('Cloud connection is healthy ✓', 'success');
    } catch (err) {
      showSyncIndicator('error');
      if (msg) msg.innerHTML = `<span style="color:var(--danger)">✗ ${err.message}</span>`;
    }
  }



  function _clearGistConfig() {
    if (!confirm('Disconnect cloud storage? Data will only be saved locally until reconnected.')) return;
    localStorage.removeItem('nexus_worker_url');
    showSyncIndicator('local');
    H.notify('Cloud storage disconnected. Data saved locally.', 'info');
    document.getElementById('gist-setup-overlay')?.remove();
    const el = document.querySelector('[data-gist-widget]');
    if (el) renderSettingsWidget(el);
  }



  async function _saveGistConfigFromModal() {
    const url = document.getElementById('gist-modal-url')?.value.trim();
    const msg = document.getElementById('gist-modal-msg');
    const btn = document.getElementById('gist-modal-save-btn');
    if (!url) {
      if (msg) msg.innerHTML = '<span style="color:var(--danger)">⚠ Worker URL is required.</span>';
      return;
    }
    localStorage.setItem('nexus_worker_url', url);
    if (msg) msg.innerHTML = '<span style="color:var(--warn)">⟳ Testing connection…</span>';
    if (btn) { btn.disabled = true; btn.textContent = '⟳ Connecting…'; }
    try {
      showSyncIndicator('syncing');
      const remote = await workerRead();
      if (!remote) {
        await workerWrite(_cache || defaults);
        if (!_cache) _cache = JSON.parse(JSON.stringify(defaults));
      } else {
        _cache = remote;
        lsWrite(_cache);
      }
      showSyncIndicator('ok');
      if (msg) msg.innerHTML = '<span style="color:var(--success)">✓ Connected! All data is now synced to your Gist.</span>';
      if (btn) { btn.textContent = '✓ Connected!'; }
      H.notify('☁️ Cloud storage connected! Data synced.', 'success');
      setTimeout(() => { document.getElementById('gist-setup-overlay')?.remove(); }, 1500);
      if (typeof navigate === 'function') navigate(window._currentPage || 'dashboard');
    } catch (err) {
      localStorage.removeItem('nexus_worker_url');
      showSyncIndicator('error');
      if (msg) msg.innerHTML = `<span style="color:var(--danger)">✗ ${err.message} — Check your Worker URL.</span>`;
      if (btn) { btn.disabled = false; btn.textContent = '☁️ Save & Connect'; }
      H.notify('Connection failed — check your Worker URL', 'error');
    }
  }



  return {
    get, set, reset, init,
    defaults, isConfigured, showSyncIndicator, showGistSetupModal,
    renderSettingsWidget,
    _saveGistConfig, _saveGistConfigFromModal, _testGistConnection, _clearGistConfig
  };
})();



// ─── Auth ────────────────────────────────────────────────────
const Auth = (() => {
  const SESSION_KEY = 'nexus_session';



  function login(username, password) {
    const data = Store.get();
    const user = data.users.find(u => u.username === username && u.password === password && u.active);
    if (!user) return null;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, loginAt: new Date().toISOString() }));
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
    if (!user) { window.location.href = 'index.html'; return null; }
    return user;
  }



  function can(user, action) {
    const perms = {
      super_admin: ['all'],
      manager:     ['create_task', 'create_project', 'view_org', 'manage_files', 'public_chat'],
      employee:    ['view_tasks', 'view_projects', 'view_org', 'view_files', 'private_chat']
    };
    const p = perms[user.role] || [];
    return p.includes('all') || p.includes(action);
  }



  return { login, logout, current, requireAuth, can };
})();



// ─── Helpers ─────────────────────────────────────────────────
const H = {
  uid: () => 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
  fmt: (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },
  ago: (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  },
  statusBadge: (status) => {
    const map = {
      active: 'badge-success', planning: 'badge-info', completed: 'badge-muted',
      on_hold: 'badge-warn', todo: 'badge-info', in_progress: 'badge-warn',
      review: 'badge-purple', cancelled: 'badge-danger'
    };
    return map[status] || 'badge-muted';
  },
  priorityIcon: (p) => ({ critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[p] || '⚪'),
  getUserById: (id) => Store.get().users.find(u => u.id === id),
  notify: (msg, type = 'info') => {
    const el = document.getElementById('toast-container');
    if (!el) return;
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span>${msg}</span>`;
    el.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3500);
  }
};
