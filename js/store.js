// ═══════════════════════════════════════════════
//  NEXUS — Central Data Store v2
//  Backend: JSONBin.io  (real-time cloud storage)
//  Falls back to localStorage if offline / no bin
// ═══════════════════════════════════════════════

// ─── JSONBin Config ───────────────────────────
//  HOW TO SET UP (one-time, takes 2 minutes):
//  1. Go to https://jsonbin.io and sign up free
//  2. Click "CREATE BIN", paste {} as content, save
//  3. Copy the BIN ID from the URL  → paste below
//  4. Go to API Keys → copy your Master Key       → paste below
//  Done! All data now syncs to the cloud.
// ─────────────────────────────────────────────
const JSONBIN_BIN_ID  = '';   // e.g. '664abc123def456'
const JSONBIN_API_KEY = '';   // e.g. '$2a$10$...'
const JSONBIN_BASE    = 'https://api.jsonbin.io/v3/b';

// Read credentials: static constants above take priority; fall back to localStorage
// so users can connect via the UI without editing code.
function getBinId()  { return JSONBIN_BIN_ID  || localStorage.getItem('nexus_bin_id')  || ''; }
function getBinKey() { return JSONBIN_API_KEY || localStorage.getItem('nexus_bin_key') || ''; }

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

// ─── Store ────────────────────────────────────
const Store = (() => {
  const LS_KEY = 'nexus_data';
  const LS_DIRTY = 'nexus_dirty';  // flag: local changes pending sync
  let _cache = null;               // in-memory cache
  let _syncTimer = null;           // debounce timer for writes

  // ── Helpers ──────────────────────────────────
  const isBinConfigured = () => !!(getBinId() && getBinKey());

  const lsRead = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)); } catch { return null; }
  };
  const lsWrite = (data) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (e) { console.warn('LS write failed', e); }
  };

  // ── JSONBin API ──────────────────────────────
  const binHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Master-Key': getBinKey(),
    'X-Bin-Versioning': 'false'   // always overwrite latest
  });

  async function binRead() {
    const res = await fetch(`${JSONBIN_BASE}/${getBinId()}/latest`, {
      headers: { 'X-Master-Key': getBinKey() }
    });
    if (!res.ok) throw new Error(`JSONBin read failed: ${res.status}`);
    const json = await res.json();
    return json.record;
  }

  async function binWrite(data) {
    const res = await fetch(`${JSONBIN_BASE}/${getBinId()}`, {
      method: 'PUT',
      headers: binHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`JSONBin write failed: ${res.status}`);
    return res.json();
  }

  // ── Init / Load ──────────────────────────────
  async function init() {
    if (isBinConfigured()) {
      try {
        showSyncIndicator('syncing');
        const remote = await binRead();
        // Merge: remote is authoritative; if empty, push defaults
        if (!remote || !remote.users) {
          await binWrite(defaults);
          _cache = JSON.parse(JSON.stringify(defaults));
          lsWrite(_cache);
        } else {
          _cache = remote;
          lsWrite(_cache);  // mirror locally for offline fallback
        }
        showSyncIndicator('ok');
        return _cache;
      } catch (err) {
        console.warn('JSONBin unreachable, using local cache', err);
        showSyncIndicator('error');
      }
    }
    // Fallback: localStorage
    const local = lsRead();
    if (!local) { lsWrite(defaults); _cache = JSON.parse(JSON.stringify(defaults)); }
    else { _cache = local; }
    return _cache;
  }

  // ── Sync to remote (debounced 800ms) ─────────
  function schedulePush() {
    localStorage.setItem(LS_DIRTY, '1');
    if (_syncTimer) clearTimeout(_syncTimer);
    _syncTimer = setTimeout(pushToRemote, 800);
  }

  async function pushToRemote() {
    if (!isBinConfigured() || !_cache) return;
    try {
      showSyncIndicator('syncing');
      await binWrite(_cache);
      localStorage.removeItem(LS_DIRTY);
      showSyncIndicator('ok');
    } catch (err) {
      console.warn('JSONBin push failed', err);
      showSyncIndicator('error');
    }
  }

  // ── Sync indicator in header ─────────────────
  function showSyncIndicator(state) {
    let el = document.getElementById('sync-indicator');
    if (!el) return;  // not mounted yet
    const map = {
      syncing: { text: '⟳ Syncing…',  color: 'var(--warn)',    title: 'Saving to cloud…' },
      ok:      { text: '✓ Saved',      color: 'var(--success)', title: 'All changes saved to cloud' },
      error:   { text: '⚠ Offline',   color: 'var(--danger)',  title: 'Cloud sync unavailable — saved locally' },
      local:   { text: '◌ Local only', color: 'var(--text-3)',  title: 'No JSONBin configured — data in browser only' }
    };
    const s = map[state] || map.local;
    el.textContent  = s.text;
    el.style.color  = s.color;
    el.title        = s.title;
  }

  // ── Public API ───────────────────────────────
  function get() {
    if (_cache) return _cache;
    // Synchronous fallback for code that calls get() before init() resolves
    const local = lsRead();
    _cache = local || JSON.parse(JSON.stringify(defaults));
    return _cache;
  }

  function set(updater) {
    const data = get();
    const updated = updater(JSON.parse(JSON.stringify(data)));  // deep clone
    _cache = updated;
    lsWrite(updated);        // instant local write
    schedulePush();          // async cloud push
    return updated;
  }

  async function reset() {
    _cache = JSON.parse(JSON.stringify(defaults));
    lsWrite(_cache);
    if (isBinConfigured()) await binWrite(_cache);
    return _cache;
  }

  // Expose init so app.js can await it before rendering
  return { get, set, reset, init, defaults, isBinConfigured, showSyncIndicator };
})();

// ─── Auth ───────────────────────────────────────
const Auth = (() => {
  const SESSION_KEY = 'nexus_session';

  function login(username, password) {
    const data = Store.get();
    const user = data.users.find(u => u.username === username && u.password === password && u.active);
    if (!user) return null;
    const session = { userId: user.id, loginAt: new Date().toISOString() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return user;
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
  }

  function current() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    const data = Store.get();
    return data.users.find(u => u.id === session.userId) || null;
  }

  function requireAuth() {
    const user = current();
    if (!user) { window.location.href = 'index.html'; return null; }
    return user;
  }

  function can(user, action) {
    const perms = {
      super_admin: ['all'],
      manager: ['create_task', 'create_project', 'view_org', 'manage_files', 'public_chat'],
      employee: ['view_tasks', 'view_projects', 'view_org', 'view_files', 'private_chat']
    };
    const p = perms[user.role] || [];
    return p.includes('all') || p.includes(action);
  }

  return { login, logout, current, requireAuth, can };
})();

// ─── Helpers ─────────────────────────────────────
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
  priorityIcon: (p) => {
    return { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[p] || '⚪';
  },
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
