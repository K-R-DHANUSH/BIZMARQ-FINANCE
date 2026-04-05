// ═══════════════════════════════════════════════
//  NEXUS — App Controller
// ═══════════════════════════════════════════════

let currentUser = null;

// applyTheme is defined in app.html inline script - stub for safety
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

document.addEventListener('DOMContentLoaded', async () => {
  // Show loading state
  document.body.style.opacity = '0';
  try {
    await Store.init();
  } catch(e) {
    console.warn('Store init error, continuing with local data', e);
  }
  document.body.style.transition = 'opacity .3s';
  document.body.style.opacity = '1';
  currentUser = Auth.requireAuth();
  if (!currentUser) return;
  initApp();
});

function initApp() {
  renderHeader();
  renderSidebar();
  navigate('dashboard');
}

// ─── Header ──────────────────────────────────
function renderHeader() {
  document.getElementById('header-user-name').textContent = currentUser.name;
  document.getElementById('header-user-role').textContent = currentUser.role.replace('_', ' ');
  document.getElementById('header-avatar').textContent = currentUser.avatar;
  document.getElementById('notif-count').style.display =
    getUnreadNotifs() > 0 ? 'block' : 'none';
  // Sync indicator state
  if (!Store.isConfigured()) {
    Store.showSyncIndicator('local');
    // Show setup banner once for super admins
    if (currentUser.role === 'super_admin') showSetupBanner();
  } else {
    Store.showSyncIndicator('ok');
  }
}

function showSetupBanner() {
  if (sessionStorage.getItem('banner_dismissed')) return;
  const existing = document.getElementById('setup-banner');
  if (existing) return;
  const banner = document.createElement('div');
  banner.id = 'setup-banner';
  banner.style.cssText = `
    position:fixed;bottom:72px;right:24px;z-index:888;
    background:var(--bg-card);border:1px solid var(--border-2);
    border-left:4px solid var(--accent);border-radius:var(--radius-lg);
    padding:16px 18px;max-width:360px;box-shadow:var(--shadow-lg);
    animation:fadeUp .3s ease;
  `;
  banner.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px">
      <div style="font-size:13px;font-weight:700;color:var(--text-1)">☁️ Connect GitHub Gist</div>
      <button onclick="document.getElementById('setup-banner').remove();sessionStorage.setItem('banner_dismissed','1')" style="color:var(--text-3);font-size:16px;line-height:1;cursor:pointer">✕</button>
    </div>
    <div style="font-size:12px;color:var(--text-2);line-height:1.6;margin-bottom:12px">
      Data is currently saved in <strong>browser localStorage only</strong>.<br>
      Connect a GitHub Gist to sync across devices &amp; users in real time.
    </div>
    <button class="btn btn-primary btn-sm" onclick="navigate('settings');document.getElementById('setup-banner')?.remove()">⚙️ Go to Settings → Cloud →</button>
  `;
  document.body.appendChild(banner);
}

// openJsonBinSetupModal removed — replaced by GitHub Gist (Settings → Cloud tab)

function getUnreadNotifs() {
  const data = Store.get();
  return data.messages.filter(m => m.type === 'public' && !m.read).length;
}

// ─── Sidebar ─────────────────────────────────
function renderSidebar() {
  const nav = document.getElementById('main-nav');
  const items = buildNavItems();
  nav.innerHTML = items.map(g => `
    <div class="nav-section">
      <div class="nav-section-label">${g.label}</div>
      ${g.items.map(i => `
        <div class="nav-item" data-page="${i.page}" onclick="navigate('${i.page}')">
          <span class="nav-icon">${i.icon}</span>
          <span>${i.name}</span>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function buildNavItems() {
  const groups = [
    { label: 'Overview', items: [
      { page: 'dashboard', icon: '⊞', name: 'Dashboard' },
      { page: 'organization', icon: '◫', name: 'Organization' }
    ]},
    { label: 'Work', items: [
      { page: 'projects', icon: '◈', name: 'Projects' },
      { page: 'my-tasks', icon: '◻', name: 'My Tasks' }
    ]},
    { label: 'Workspace', items: [
      { page: 'calendar', icon: '◷', name: 'Calendar' },
      { page: 'files', icon: '◱', name: 'File Storage' },
      { page: 'chat', icon: '◉', name: 'Chat' }
    ]}
  ];
  if (Auth.can(currentUser, 'create_task')) {
    groups[1].items.push({ page: 'task-create', icon: '⊕', name: 'Create Task' });
  }
  if (Auth.can(currentUser, 'create_project')) {
    groups[1].items.push({ page: 'project-create', icon: '⊕', name: 'Create Project' });
  }
  if (currentUser.role === 'super_admin') {
    groups.push({ label: 'Admin', items: [
      { page: 'users', icon: '◎', name: 'User Management' }
    ]});
  }
  groups.push({ label: 'Personal', items: [
    { page: 'settings', icon: '⚙', name: 'Settings' }
  ]});
  return groups;
}

// ─── Navigation ───────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');
  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');
  const renders = {
    'dashboard': renderDashboard,
    'organization': renderOrganization,
    'projects': renderProjects,
    'my-tasks': renderMyTasks,
    'calendar': renderCalendar,
    'files': renderFiles,
    'chat': renderChat,
    'task-create': renderTaskCreate,
    'project-create': renderProjectCreate,
    'users': renderUsers,
    'settings': renderSettings
  };
  if (renders[page]) renders[page]();
}

// ═══════════════════════════════════════════════
//  PAGE: DASHBOARD
// ═══════════════════════════════════════════════
function renderDashboard() {
  const data = Store.get();
  const c = data.company;
  const myTasks = data.tasks.filter(t => t.assignedTo === currentUser.id);
  const activeProjCount = data.projects.filter(p => p.status === 'active').length;
  const pendingTasks = myTasks.filter(t => t.status !== 'completed').length;
  const completedTasks = myTasks.filter(t => t.status === 'completed').length;
  const container = document.getElementById('dashboard-content');
  const isSA = currentUser.role === 'super_admin';

  container.innerHTML = `
    <div class="fade-up">
      <!-- Company Hero -->
      <div class="card" style="background:linear-gradient(135deg,var(--accent-glow),#eef2ff20);margin-bottom:24px;border-color:var(--border);">
        <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
          <div style="font-size:52px">${c.logo}</div>
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <h1 style="font-size:26px;letter-spacing:-1px">${isSA ? `<span class="editable-field" onclick="editCompanyField('name','${c.name}')">${c.name}</span>` : c.name}</h1>
              ${isSA ? `<button class="btn btn-ghost btn-sm" onclick="openEditCompanyModal()" style="font-size:11px">✏️ Edit Company</button>` : ''}
            </div>
            <p style="color:var(--text-3);font-family:var(--font-mono);font-size:12px;margin-top:4px;letter-spacing:1px">${c.tagline}</p>
            <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
              ${c.values.map(v => `<span class="badge badge-info">${v}</span>`).join('')}
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:1px">Founded</div>
            <div style="font-size:24px;font-family:var(--font-head);font-weight:800">${c.founded}</div>
          </div>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="grid-4" style="margin-bottom:24px;">
        <div class="stat-card" style="--accent-clr:var(--accent)">
          <div class="stat-icon">◈</div>
          <div class="stat-val">${activeProjCount}</div>
          <div class="stat-label">Active Projects</div>
        </div>
        <div class="stat-card" style="--accent-clr:var(--warn)">
          <div class="stat-icon">◻</div>
          <div class="stat-val">${pendingTasks}</div>
          <div class="stat-label">My Pending Tasks</div>
        </div>
        <div class="stat-card" style="--accent-clr:var(--success)">
          <div class="stat-icon">✓</div>
          <div class="stat-val">${completedTasks}</div>
          <div class="stat-label">Completed Tasks</div>
        </div>
        <div class="stat-card" style="--accent-clr:var(--accent-3)">
          <div class="stat-icon">◎</div>
          <div class="stat-val">${data.users.filter(u=>u.active).length}</div>
          <div class="stat-label">Team Members</div>
        </div>
      </div>

      <div class="grid-2" style="margin-bottom:24px;">
        <!-- Mission & Vision -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Mission & Vision</div>
            ${isSA ? `<button class="btn btn-ghost btn-sm" onclick="openEditMissionModal()" style="font-size:11px">✏️ Edit</button>` : ''}
          </div>
          <div style="margin-bottom:16px;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--accent);margin-bottom:8px;font-weight:700">Our Mission</div>
            <p style="font-size:13px;color:var(--text-2);line-height:1.7">${c.mission}</p>
          </div>
          <div>
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--accent-3);margin-bottom:8px;font-weight:700">Our Vision</div>
            <p style="font-size:13px;color:var(--text-2);line-height:1.7">${c.vision}</p>
          </div>
        </div>

        <!-- Active Projects -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Active Projects</div>
            <button class="btn btn-ghost btn-sm" onclick="navigate('projects')">View All</button>
          </div>
          ${data.projects.filter(p=>p.status==='active').slice(0,3).map(p => `
            <div style="margin-bottom:18px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div>
                  <div style="font-size:13px;font-weight:600">${p.name}</div>
                  <div style="font-size:11px;color:var(--text-3)">${p.code}</div>
                </div>
                <span class="badge ${H.statusBadge(p.priority)}">${p.priority}</span>
              </div>
              <div style="display:flex;align-items:center;gap:12px;">
                <div class="progress-wrap" style="flex:1"><div class="progress-bar" style="width:${p.completion}%"></div></div>
                <div style="font-size:12px;color:var(--text-2);font-family:var(--font-mono)">${p.completion}%</div>
              </div>
            </div>
          `).join('') || '<div class="empty-state"><p>No active projects</p></div>'}
        </div>
      </div>

      <!-- My Recent Tasks + Announcements -->
      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <div class="card-title">My Tasks</div>
            <button class="btn btn-ghost btn-sm" onclick="navigate('my-tasks')">View All</button>
          </div>
          ${myTasks.slice(0,4).map(t => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:16px">${H.priorityIcon(t.priority)}</span>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:500">${t.title}</div>
                <div style="font-size:11px;color:var(--text-3)">Due ${H.fmt(t.dueDate)}</div>
              </div>
              <span class="badge ${H.statusBadge(t.status)}">${t.status.replace('_',' ')}</span>
            </div>
          `).join('') || '<div class="empty-state"><p>No tasks assigned</p></div>'}
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">Announcements</div>
          </div>
          ${data.messages.filter(m=>m.type==='public').slice(0,4).map(m => {
            const u = H.getUserById(m.from);
            return `
              <div style="padding:12px 0;border-bottom:1px solid var(--border)">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                  <div class="avatar" style="width:26px;height:26px;font-size:10px">${u?.avatar||'?'}</div>
                  <span style="font-size:12px;font-weight:600">${u?.name||'Unknown'}</span>
                  <span style="font-size:11px;color:var(--text-3);margin-left:auto">${H.ago(m.time)}</span>
                </div>
                <p style="font-size:13px;color:var(--text-2)">${m.text}</p>
              </div>
            `;
          }).join('') || '<div class="empty-state"><p>No announcements</p></div>'}
        </div>
      </div>
    </div>
  `;
}

// ─── Edit Company Info (Super Admin) ─────────
function openEditCompanyModal() {
  const data = Store.get();
  const c = data.company;
  document.getElementById('modal-title').textContent = 'Edit Company Details';
  document.getElementById('modal-confirm').textContent = '✓ Save';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-row">
      <div class="form-field"><label>Company Name *</label><input id="ec-name" value="${c.name}"></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label>Tagline</label><input id="ec-tagline" value="${c.tagline}"></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label>Founded Year</label><input id="ec-founded" value="${c.founded}"></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label>Company Values (comma separated)</label>
        <input id="ec-values" value="${c.values.join(', ')}">
      </div>
    </div>
  `;
  document.getElementById('modal-confirm').onclick = () => {
    const name = document.getElementById('ec-name').value.trim();
    if (!name) { H.notify('Company name required','error'); return; }
    Store.set(data => {
      data.company.name = name;
      data.company.tagline = document.getElementById('ec-tagline').value.trim();
      data.company.founded = document.getElementById('ec-founded').value.trim();
      data.company.values = document.getElementById('ec-values').value.split(',').map(v=>v.trim()).filter(Boolean);
      return data;
    });
    closeModal(); H.notify('Company info updated!','success'); renderDashboard();
  };
  openModal();
}

function openEditMissionModal() {
  const data = Store.get();
  const c = data.company;
  document.getElementById('modal-title').textContent = 'Edit Mission & Vision';
  document.getElementById('modal-confirm').textContent = '✓ Save';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-row">
      <div class="form-field"><label>Mission Statement</label>
        <textarea id="ec-mission" rows="4">${c.mission}</textarea>
      </div>
    </div>
    <div class="form-row">
      <div class="form-field"><label>Vision Statement</label>
        <textarea id="ec-vision" rows="4">${c.vision}</textarea>
      </div>
    </div>
  `;
  document.getElementById('modal-confirm').onclick = () => {
    Store.set(data => {
      data.company.mission = document.getElementById('ec-mission').value.trim();
      data.company.vision = document.getElementById('ec-vision').value.trim();
      return data;
    });
    closeModal(); H.notify('Mission & Vision updated!','success'); renderDashboard();
  };
  openModal();
}

// ═══════════════════════════════════════════════
//  PAGE: ORGANIZATION
// ═══════════════════════════════════════════════
function renderOrganization() {
  const data = Store.get();
  const canEdit = Auth.can(currentUser, 'create_task') || currentUser.role === 'super_admin';
  const container = document.getElementById('org-content');
  container.innerHTML = `
    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab(this,'org-hierarchy')">Hierarchy</button>
      <button class="tab-btn" onclick="switchTab(this,'org-directory')">Directory</button>
      <button class="tab-btn" onclick="switchTab(this,'org-structure')">Structure</button>
    </div>
    <div id="org-hierarchy" class="tab-pane active">${buildOrgHierarchy(data)}</div>
    <div id="org-directory" class="tab-pane">${buildOrgDirectory(data, canEdit)}</div>
    <div id="org-structure" class="tab-pane">${buildOrgStructure(data, canEdit)}</div>
  `;
}

function buildOrgHierarchy(data) {
  // All users with no manager = top level (can be multiple co-founders/C-suite)
  const topLevel = data.users.filter(u => u.managerId === null && u.active);
  if (!topLevel.length) return '<div class="empty-state"><div class="empty-icon">◫</div><p>No hierarchy defined</p></div>';

  return `
    <div style="overflow-x:auto;padding:10px 0;">
      <div style="display:flex;flex-direction:column;align-items:center;">
        ${topLevel.length === 1
          ? renderOrgNode(topLevel[0], data.users)
          : `<div style="display:flex;gap:24px;justify-content:center;flex-wrap:wrap;align-items:flex-start;">
              ${topLevel.map(u => renderOrgNode(u, data.users)).join('')}
            </div>`
        }
      </div>
    </div>

    <div style="margin-top:40px;">
      <div style="font-size:13px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.8px;margin-bottom:20px;padding-bottom:10px;border-bottom:1px solid var(--border);">
        Division & Department Structure
      </div>
      ${data.divisions.map(div => {
        const depts = data.departments.filter(d => d.divisionId === div.id);
        const divMembers = data.users.filter(u => u.division === div.name && u.active);
        if (divMembers.length === 0 && depts.length === 0) return '';
        return `
          <div class="org-division-block">
            <div class="org-division-header">
              <span style="font-size:18px">◫</span>
              <div>
                <div>${div.name}</div>
                <div style="font-size:11px;font-weight:400;opacity:.8">${div.description}</div>
              </div>
              <span class="badge" style="background:rgba(255,255,255,.2);color:#fff;margin-left:auto">${divMembers.length} members</span>
            </div>
            <div class="org-dept-row">
              ${depts.map(dept => {
                const members = data.users.filter(u => u.department === dept.name && u.active);
                return `
                  <div class="org-dept-block">
                    <div class="org-dept-title">${dept.name}</div>
                    <div class="org-dept-members">
                      ${members.length === 0 
                        ? `<div style="color:var(--text-3);font-size:11px;text-align:center;padding:8px">No members assigned</div>`
                        : members.map(m => {
                            const mgr = m.managerId ? H.getUserById(m.managerId) : null;
                            return `
                              <div class="org-member-row" onclick="showUserProfile('${m.id}')">
                                <div class="avatar" style="width:32px;height:32px;font-size:11px;flex-shrink:0">${m.avatar}</div>
                                <div style="flex:1;min-width:0">
                                  <div class="org-member-name">${m.name}</div>
                                  <div class="org-member-pos">${m.position}</div>
                                  ${mgr ? `<div class="org-reports-to">↑ ${mgr.name}</div>` : ''}
                                </div>
                                <span class="badge ${m.role==='super_admin'?'badge-info':m.role==='manager'?'badge-success':'badge-muted'}" style="font-size:10px;flex-shrink:0">${m.role==='super_admin'?'Admin':m.role==='manager'?'Mgr':'Emp'}</span>
                              </div>
                            `;
                          }).join('')}
                    </div>
                  </div>
                `;
              }).join('')}
              ${(() => {
                // People in this division but no specific dept assigned
                const unassigned = divMembers.filter(u => !depts.find(d => d.name === u.department));
                if (unassigned.length === 0) return '';
                return `
                  <div class="org-dept-block" style="border-style:dashed">
                    <div class="org-dept-title" style="color:var(--text-3)">Unassigned Department</div>
                    <div class="org-dept-members">
                      ${unassigned.map(m => `
                        <div class="org-member-row" onclick="showUserProfile('${m.id}')">
                          <div class="avatar" style="width:32px;height:32px;font-size:11px;flex-shrink:0">${m.avatar}</div>
                          <div style="flex:1">
                            <div class="org-member-name">${m.name}</div>
                            <div class="org-member-pos">${m.position}</div>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                `;
              })()}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderOrgNode(user, allUsers) {
  const children = allUsers.filter(u => u.managerId === user.id);
  return `
    <div class="org-node-wrap">
      <div class="org-node ${user.role}" onclick="showUserProfile('${user.id}')">
        <div class="avatar" style="margin:0 auto;">${user.avatar}</div>
        <div class="org-node-name">${user.name}</div>
        <div class="org-node-pos">${user.position}</div>
        <span class="badge ${user.role==='super_admin'?'badge-info':user.role==='manager'?'badge-success':'badge-muted'}" style="margin-top:6px">${user.role.replace('_',' ')}</span>
      </div>
      ${children.length ? `
        <div class="org-children">
          ${children.map(c => `<div class="org-children-wrap">${renderOrgNode(c, allUsers)}</div>`).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function buildOrgDirectory(data, canEdit) {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <div style="font-size:14px;color:var(--text-2)">${data.users.filter(u=>u.active).length} active members</div>
      ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openAddUserModal()">+ Add Member</button>` : ''}
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Name</th><th>Position</th><th>Department</th><th>Division</th>
          <th>Reports To</th><th>Role</th><th>Status</th>
          ${canEdit ? '<th>Actions</th>' : ''}
        </tr></thead>
        <tbody>
          ${data.users.map(u => {
            const manager = u.managerId ? H.getUserById(u.managerId) : null;
            return `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:10px;">
                    <div class="avatar">${u.avatar}</div>
                    <div>
                      <div style="font-weight:600;font-size:13px">${u.name}</div>
                      <div style="font-size:11px;color:var(--text-3)">${u.email}</div>
                    </div>
                  </div>
                </td>
                <td style="font-size:13px">${u.position}</td>
                <td><span class="badge badge-muted">${u.department}</span></td>
                <td style="font-size:13px;color:var(--text-2)">${u.division}</td>
                <td style="font-size:13px;color:var(--text-2)">${manager?.name || '—'}</td>
                <td><span class="badge ${u.role==='super_admin'?'badge-info':u.role==='manager'?'badge-success':'badge-muted'}">${u.role.replace('_',' ')}</span></td>
                <td><span class="badge ${u.active?'badge-success':'badge-danger'}">${u.active?'Active':'Inactive'}</span></td>
                ${canEdit ? `<td>
                  <div style="display:flex;gap:6px;">
                    <button class="btn btn-ghost btn-sm btn-icon" onclick="openEditUserModal('${u.id}')" title="Edit">✏️</button>
                    ${currentUser.role==='super_admin'?`<button class="btn btn-danger btn-sm btn-icon" onclick="toggleUserStatus('${u.id}')" title="Toggle">${u.active?'🔒':'🔓'}</button>`:''}
                    ${currentUser.role==='super_admin'&&u.id!==currentUser.id?`<button class="btn btn-danger btn-sm btn-icon" onclick="deleteUser('${u.id}')" title="Delete">🗑️</button>`:''}
                  </div>
                </td>` : ''}
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function buildOrgStructure(data, canEdit) {
  return `
    ${canEdit ? `
      <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" onclick="openDivisionModal()">+ Add Division</button>
        <button class="btn btn-ghost btn-sm" onclick="openDepartmentModal()">+ Add Department</button>
      </div>
    ` : ''}
    <div class="grid-2" style="gap:24px;">
      ${data.divisions.map(div => {
        const depts = data.departments.filter(d => d.divisionId === div.id);
        return `
          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title">${div.name}</div>
                <div style="font-size:12px;color:var(--text-3)">${div.description}</div>
              </div>
              ${canEdit ? `
                <div style="display:flex;gap:6px;">
                  <button class="btn btn-ghost btn-sm btn-icon" onclick="openDivisionModal('${div.id}')" title="Edit Division">✏️</button>
                  <button class="btn btn-danger btn-sm btn-icon" onclick="deleteDivision('${div.id}')" title="Delete Division">🗑️</button>
                </div>
              ` : ''}
            </div>
            ${depts.map(dept => {
              const members = data.users.filter(u => u.department === dept.name);
              return `
                <div style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius);padding:12px;margin-bottom:10px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span style="font-size:13px;font-weight:600;color:var(--text-1)">${dept.name}</span>
                    <div style="display:flex;align-items:center;gap:6px;">
                      <span class="badge badge-muted">${members.length} members</span>
                      ${canEdit ? `
                        <button class="btn btn-ghost btn-sm btn-icon" onclick="openDepartmentModal('${dept.id}')" title="Edit Dept" style="padding:3px 6px;font-size:11px;">✏️</button>
                        <button class="btn btn-ghost btn-sm btn-icon" onclick="openAssignMemberModal('${dept.id}')" title="Assign Member" style="padding:3px 6px;font-size:11px;">👤+</button>
                        <button class="btn btn-danger btn-sm btn-icon" onclick="deleteDepartment('${dept.id}')" title="Delete Dept" style="padding:3px 6px;font-size:11px;">🗑️</button>
                      ` : ''}
                    </div>
                  </div>
                  <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    ${members.map(m=>`<div class="avatar" title="${m.name}" style="width:28px;height:28px;font-size:10px">${m.avatar}</div>`).join('')}
                    ${members.length===0?'<span style="font-size:12px;color:var(--text-3)">No members</span>':''}
                  </div>
                </div>
              `;
            }).join('')}
            ${canEdit ? `
              <div style="border:1px dashed var(--border-2);border-radius:var(--radius);padding:10px;text-align:center;cursor:pointer;color:var(--text-3);font-size:12px;"
                onclick="openDepartmentModal(null, '${div.id}')">+ Add Department to ${div.name}</div>
            ` : ''}
          </div>
        `;
      }).join('')}
      ${canEdit ? `
        <div class="card" style="border-style:dashed;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:120px;cursor:pointer;" onclick="openDivisionModal()">
          <div style="font-size:28px;color:var(--text-3)">⊕</div>
          <div style="color:var(--text-3);font-size:13px">Add New Division</div>
        </div>
      ` : ''}
    </div>
  `;
}

// ─── Division Modal ───────────────────────────
function openDivisionModal(editId = null) {
  const data = Store.get();
  const div = editId ? data.divisions.find(d => d.id === editId) : null;
  document.getElementById('modal-title').textContent = editId ? 'Edit Division' : 'Add Division';
  document.getElementById('modal-confirm').textContent = editId ? '✓ Save' : '✓ Create';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-row">
      <div class="form-field"><label>Division Name *</label><input id="dv-name" value="${div?.name||''}" placeholder="e.g. Technology"></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label>Description</label><input id="dv-desc" value="${div?.description||''}" placeholder="e.g. Engineering, Design & Product"></div>
    </div>
  `;
  document.getElementById('modal-confirm').onclick = () => {
    const name = document.getElementById('dv-name').value.trim();
    if (!name) { H.notify('Division name required', 'error'); return; }
    Store.set(data => {
      if (editId) {
        const d = data.divisions.find(x => x.id === editId);
        if (d) { d.name = name; d.description = document.getElementById('dv-desc').value; }
      } else {
        data.divisions.push({ id: H.uid(), name, description: document.getElementById('dv-desc').value });
      }
      return data;
    });
    closeModal();
    H.notify(editId ? 'Division updated!' : 'Division created!', 'success');
    renderOrganization();
    document.querySelector('.tab-btn:nth-child(3)')?.click();
  };
  openModal();
}

function deleteDivision(divId) {
  const data = Store.get();
  const hasDepts = data.departments.some(d => d.divisionId === divId);
  if (hasDepts) { H.notify('Remove all departments from this division first', 'error'); return; }
  if (!confirm('Delete this division?')) return;
  Store.set(data => { data.divisions = data.divisions.filter(d => d.id !== divId); return data; });
  H.notify('Division deleted', 'success');
  renderOrganization();
}

// ─── Department Modal ─────────────────────────
function openDepartmentModal(editId = null, presetDivId = null) {
  const data = Store.get();
  const dept = editId ? data.departments.find(d => d.id === editId) : null;
  document.getElementById('modal-title').textContent = editId ? 'Edit Department' : 'Add Department';
  document.getElementById('modal-confirm').textContent = editId ? '✓ Save' : '✓ Create';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-row">
      <div class="form-field"><label>Department Name *</label><input id="dp-name" value="${dept?.name||''}" placeholder="e.g. Engineering"></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label>Division *</label>
        <select id="dp-div">
          <option value="">Select division...</option>
          ${data.divisions.map(d => `<option value="${d.id}" ${(dept?.divisionId===d.id || presetDivId===d.id) ? 'selected' : ''}>${d.name}</option>`).join('')}
        </select>
      </div>
    </div>
  `;
  document.getElementById('modal-confirm').onclick = () => {
    const name = document.getElementById('dp-name').value.trim();
    const divisionId = document.getElementById('dp-div').value;
    if (!name || !divisionId) { H.notify('Fill all fields', 'error'); return; }
    Store.set(data => {
      if (editId) {
        const d = data.departments.find(x => x.id === editId);
        if (d) { d.name = name; d.divisionId = divisionId; }
      } else {
        data.departments.push({ id: H.uid(), name, divisionId });
      }
      return data;
    });
    closeModal();
    H.notify(editId ? 'Department updated!' : 'Department created!', 'success');
    renderOrganization();
  };
  openModal();
}

function deleteDepartment(deptId) {
  const data = Store.get();
  const dept = data.departments.find(d => d.id === deptId);
  const hasMembers = data.users.some(u => u.department === dept?.name);
  if (hasMembers) { H.notify('Reassign all members from this department first', 'error'); return; }
  if (!confirm('Delete this department?')) return;
  Store.set(data => { data.departments = data.departments.filter(d => d.id !== deptId); return data; });
  H.notify('Department deleted', 'success');
  renderOrganization();
}

// ─── Assign Member to Department ─────────────
function openAssignMemberModal(deptId) {
  const data = Store.get();
  const dept = data.departments.find(d => d.id === deptId);
  const div = data.divisions.find(d => d.id === dept?.divisionId);
  const currentMembers = data.users.filter(u => u.department === dept?.name);
  document.getElementById('modal-title').textContent = `Manage Members — ${dept?.name}`;
  document.getElementById('modal-confirm').textContent = '✓ Save';
  document.getElementById('modal-body').innerHTML = `
    <div style="margin-bottom:16px;padding:12px;background:var(--bg-base);border-radius:var(--radius);border:1px solid var(--border)">
      <div style="font-size:12px;color:var(--text-3)">Division</div>
      <div style="font-size:13px;font-weight:600;margin-top:2px">${div?.name || '—'}</div>
    </div>
    <div class="form-row">
      <div class="form-field">
        <label>Assign User to this Department</label>
        <select id="assign-user">
          <option value="">Select user...</option>
          ${data.users.map(u => `<option value="${u.id}" ${u.department===dept?.name?'selected':''}>${u.name} (currently: ${u.department||'Unassigned'})</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="margin-top:8px;">
      <div style="font-size:12px;color:var(--text-2);margin-bottom:10px;font-weight:500">Current Members (${currentMembers.length})</div>
      ${currentMembers.length === 0 ? '<div style="color:var(--text-3);font-size:12px">No members yet</div>' :
        currentMembers.map(m => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--bg-base);border-radius:var(--radius-sm);margin-bottom:6px;border:1px solid var(--border);">
            <div class="avatar" style="width:28px;height:28px;font-size:10px">${m.avatar}</div>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:500">${m.name}</div>
              <div style="font-size:11px;color:var(--text-3)">${m.position}</div>
            </div>
            <button class="btn btn-danger btn-sm" onclick="removeMemberFromDept('${m.id}','${deptId}')">Remove</button>
          </div>
        `).join('')}
    </div>
  `;
  document.getElementById('modal-confirm').onclick = () => {
    const userId = document.getElementById('assign-user').value;
    if (!userId) { H.notify('Select a user to assign', 'error'); return; }
    Store.set(data => {
      const u = data.users.find(x => x.id === userId);
      if (u) { u.department = dept.name; u.division = div?.name || u.division; }
      return data;
    });
    closeModal();
    H.notify('Member assigned!', 'success');
    renderOrganization();
  };
  openModal();
}

function removeMemberFromDept(userId, deptId) {
  Store.set(data => {
    const u = data.users.find(x => x.id === userId);
    if (u) u.department = '';
    return data;
  });
  H.notify('Member removed from department', 'success');
  const dept = Store.get().departments.find(d => d.id === deptId);
  openAssignMemberModal(deptId);
}

// ═══════════════════════════════════════════════
//  PAGE: PROJECTS
// ═══════════════════════════════════════════════
function renderProjects() {
  const data = Store.get();
  const container = document.getElementById('projects-content');
  const total = data.projects.length;
  const active = data.projects.filter(p=>p.status==='active').length;
  const completed = data.projects.filter(p=>p.status==='completed').length;
  const planning = data.projects.filter(p=>p.status==='planning').length;

  container.innerHTML = `
    <div class="fade-up">
      <div class="grid-4" style="margin-bottom:24px;">
        <div class="stat-card" style="--accent-clr:var(--accent)">
          <div class="stat-val">${total}</div><div class="stat-label">Total Projects</div>
        </div>
        <div class="stat-card" style="--accent-clr:var(--success)">
          <div class="stat-val">${active}</div><div class="stat-label">Active</div>
        </div>
        <div class="stat-card" style="--accent-clr:var(--accent-2)">
          <div class="stat-val">${planning}</div><div class="stat-label">Planning</div>
        </div>
        <div class="stat-card" style="--accent-clr:var(--text-3)">
          <div class="stat-val">${completed}</div><div class="stat-label">Completed</div>
        </div>
      </div>

      <div class="grid-3">
        ${data.projects.map(p => renderProjectCard(p, data)).join('')}
        ${Auth.can(currentUser,'create_project') ? `
          <div class="card" style="border-style:dashed;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:220px;cursor:pointer;transition:all .2s" onclick="navigate('project-create')">
            <div style="font-size:32px;color:var(--text-3)">⊕</div>
            <div style="color:var(--text-3);font-size:13px">Create New Project</div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderProjectCard(p, data) {
  const manager = H.getUserById(p.managerId);
  const tasks = data.tasks.filter(t => t.projectId === p.id);
  const isSA = currentUser.role === 'super_admin';
  const canEdit = Auth.can(currentUser, 'create_project');
  return `
    <div class="card" style="cursor:pointer" onclick="showProjectDetail('${p.id}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:10px;font-family:var(--font-mono);color:var(--text-3);margin-bottom:3px;letter-spacing:.5px">${p.code}</div>
          <div style="font-size:15px;font-weight:700;font-family:var(--font-head);line-height:1.3">${p.name}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-left:10px;flex-shrink:0">
          <span class="badge ${H.statusBadge(p.status)}">${p.status}</span>
          ${canEdit ? `<button class="btn btn-ghost btn-sm btn-icon" onclick="event.stopPropagation();openEditProjectModal('${p.id}')" title="Edit project" style="font-size:13px">✏️</button>` : ''}
          ${isSA ? `<button class="btn btn-danger btn-sm btn-icon" onclick="event.stopPropagation();deleteProject('${p.id}')" title="Delete project" style="font-size:13px">🗑</button>` : ''}
        </div>
      </div>
      <p style="font-size:12px;color:var(--text-3);margin-bottom:16px;line-height:1.6">${p.description.slice(0,90)}...</p>
      <div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:12px;color:var(--text-3)">Progress</span>
          <span style="font-size:12px;font-family:var(--font-mono);color:var(--text-2)">${p.completion}%</span>
        </div>
        <div class="progress-wrap"><div class="progress-bar" style="width:${p.completion}%"></div></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--text-3);">
        <div>📅 ${H.fmt(p.endDate)}</div>
        <div style="display:flex;align-items:center;gap:6px;">
          <div class="avatar" style="width:22px;height:22px;font-size:9px">${manager?.avatar||'?'}</div>
          <span>${manager?.name?.split(' ')[0]||'—'}</span>
        </div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;">
        <span class="badge ${H.statusBadge(p.priority)}">${H.priorityIcon(p.priority)} ${p.priority}</span>
        <span class="badge badge-muted">${tasks.length} tasks</span>
      </div>
    </div>
  `;
}

function deleteProject(projId) {
  const data = Store.get();
  const p = data.projects.find(x => x.id === projId);
  if (!confirm(`Delete project "${p?.name}"? All associated tasks will also be removed. This cannot be undone.`)) return;
  Store.set(data => {
    data.projects = data.projects.filter(x => x.id !== projId);
    data.tasks = data.tasks.filter(t => t.projectId !== projId);
    return data;
  });
  H.notify('Project deleted', 'success');
  renderProjects();
}

function openEditProjectModal(projId) {
  const data = Store.get();
  const p = data.projects.find(x => x.id === projId);
  if (!p) return;
  const managers = data.users.filter(u => (u.role === 'manager' || u.role === 'super_admin') && u.active);
  const employees = data.users.filter(u => u.active);

  document.getElementById('modal-title').textContent = `✏️ Edit Project — ${p.code}`;
  document.getElementById('modal-confirm').textContent = '✓ Save Changes';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-row cols-2">
      <div class="form-field"><label>Project Name *</label><input id="ep-name" value="${p.name}"></div>
      <div class="form-field"><label>Project Code *</label><input id="ep-code" value="${p.code}"></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label>Description</label><textarea id="ep-desc" rows="3">${p.description||''}</textarea></div>
    </div>
    <div class="form-row cols-2">
      <div class="form-field"><label>Status</label>
        <select id="ep-status">
          ${['planning','active','on_hold','completed'].map(s=>`<option value="${s}" ${p.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('')}
        </select>
      </div>
      <div class="form-field"><label>Priority</label>
        <select id="ep-priority">
          ${['low','medium','high'].map(s=>`<option value="${s}" ${p.priority===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row cols-2">
      <div class="form-field"><label>Project Manager *</label>
        <select id="ep-manager">
          <option value="">Select manager...</option>
          ${managers.map(u=>`<option value="${u.id}" ${p.managerId===u.id?'selected':''}>${u.name} — ${u.position}</option>`).join('')}
        </select>
      </div>
      <div class="form-field"><label>Completion %</label>
        <input type="number" id="ep-completion" min="0" max="100" value="${p.completion||0}">
      </div>
    </div>
    <div class="form-row cols-2">
      <div class="form-field"><label>Start Date</label><input type="date" id="ep-start" value="${p.startDate||''}"></div>
      <div class="form-field"><label>End Date *</label><input type="date" id="ep-end" value="${p.endDate||''}"></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label>Team Members</label>
        <div style="border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-base);max-height:180px;overflow-y:auto;padding:10px 12px;">
          ${employees.map(u => `
            <label style="display:flex;align-items:center;gap:10px;padding:5px 4px;cursor:pointer;border-radius:4px;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
              <input type="checkbox" value="${u.id}" class="ep-member-cb" ${(p.teamIds||[]).includes(u.id)?'checked':''} style="width:14px;height:14px;cursor:pointer">
              <div class="avatar" style="width:24px;height:24px;font-size:9px;flex-shrink:0">${u.avatar}</div>
              <div style="flex:1"><div style="font-size:13px;font-weight:500">${u.name}</div><div style="font-size:10px;color:var(--text-3)">${u.position}</div></div>
              <span class="badge ${u.role==='super_admin'?'badge-info':u.role==='manager'?'badge-success':'badge-muted'}" style="font-size:10px">${u.role.replace('_',' ')}</span>
            </label>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-confirm').onclick = () => {
    const name = document.getElementById('ep-name').value.trim();
    const code = document.getElementById('ep-code').value.trim();
    const manager = document.getElementById('ep-manager').value;
    const end = document.getElementById('ep-end').value;
    if (!name||!code||!manager||!end) { H.notify('Fill required fields','error'); return; }
    const teamIds = Array.from(document.querySelectorAll('.ep-member-cb:checked')).map(cb=>cb.value);
    Store.set(data => {
      const proj = data.projects.find(x=>x.id===projId);
      if (proj) {
        proj.name=name; proj.code=code; proj.description=document.getElementById('ep-desc').value;
        proj.status=document.getElementById('ep-status').value;
        proj.priority=document.getElementById('ep-priority').value;
        proj.managerId=manager; proj.endDate=end;
        proj.startDate=document.getElementById('ep-start').value;
        proj.completion=Math.min(100,Math.max(0,parseInt(document.getElementById('ep-completion').value)||0));
        proj.teamIds=teamIds;
      }
      return data;
    });
    closeModal();
    H.notify(`Project "${name}" updated!`, 'success');
    renderProjects();
  };
  openModal();
}

// ═══════════════════════════════════════════════
//  PAGE: MY TASKS
// ═══════════════════════════════════════════════
function renderMyTasks() {
  const data = Store.get();
  const myTasks = data.tasks.filter(t => t.assignedTo === currentUser.id);
  const container = document.getElementById('mytasks-content');
  const todo = myTasks.filter(t=>t.status==='todo');
  const inprog = myTasks.filter(t=>t.status==='in_progress');
  const review = myTasks.filter(t=>t.status==='review');
  const done = myTasks.filter(t=>t.status==='completed');

  container.innerHTML = `
    <div class="fade-up">
      <div class="grid-4" style="margin-bottom:24px;">
        <div class="stat-card" style="--accent-clr:var(--text-3)">
          <div class="stat-val">${todo.length}</div><div class="stat-label">To Do</div>
        </div>
        <div class="stat-card" style="--accent-clr:var(--warn)">
          <div class="stat-val">${inprog.length}</div><div class="stat-label">In Progress</div>
        </div>
        <div class="stat-card" style="--accent-clr:var(--purple)">
          <div class="stat-val">${review.length}</div><div class="stat-label">In Review</div>
        </div>
        <div class="stat-card" style="--accent-clr:var(--success)">
          <div class="stat-val">${done.length}</div><div class="stat-label">Completed</div>
        </div>
      </div>

      <!-- Kanban Columns -->
      <div class="grid-4" style="align-items:start;">
        ${[
          {label:'To Do', items:todo, color:'var(--text-3)', status:'todo'},
          {label:'In Progress', items:inprog, color:'var(--warn)', status:'in_progress'},
          {label:'In Review', items:review, color:'var(--purple)', status:'review'},
          {label:'Completed', items:done, color:'var(--success)', status:'completed'}
        ].map(col => `
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
              <div style="width:8px;height:8px;border-radius:50%;background:${col.color}"></div>
              <span style="font-size:13px;font-weight:600">${col.label}</span>
              <span class="badge badge-muted" style="margin-left:auto">${col.items.length}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:12px;">
              ${col.items.map(t => renderTaskCard(t, data, true)).join('') || `
                <div style="border:1px dashed var(--border);border-radius:var(--radius);padding:20px;text-align:center;color:var(--text-3);font-size:12px">No tasks</div>
              `}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderTaskCard(t, data, showActions) {
  const manager = H.getUserById(t.reportingManagerId);
  const project = data.projects.find(p=>p.id===t.projectId);
  return `
    <div class="card card-sm" style="cursor:pointer" onclick="showTaskDetail('${t.id}')">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:16px">${H.priorityIcon(t.priority)}</span>
        <span class="badge ${H.statusBadge(t.status)}">${t.status.replace('_',' ')}</span>
      </div>
      <div style="font-size:13px;font-weight:600;margin-bottom:4px">${t.title}</div>
      ${project?`<div style="font-size:11px;color:var(--text-3);margin-bottom:8px">📁 ${project.name}</div>`:''}
      <div style="font-size:11px;color:var(--text-3);margin-bottom:8px">Due: ${H.fmt(t.dueDate)}</div>
      ${t.tags.length ? `<div>${t.tags.map(tag=>`<span class="tag">${tag}</span>`).join('')}</div>` : ''}
      ${showActions && t.status !== 'completed' ? `
        <div style="margin-top:12px;display:flex;gap:6px;">
          ${t.status === 'todo' ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();updateTaskStatus('${t.id}','in_progress')">Start</button>` : ''}
          ${t.status === 'in_progress' ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();updateTaskStatus('${t.id}','review')">Submit</button>` : ''}
          ${t.status === 'review' && Auth.can(currentUser,'create_task') ? `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();updateTaskStatus('${t.id}','completed')">Approve</button>` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

function updateTaskStatus(taskId, newStatus) {
  Store.set(data => {
    const task = data.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = newStatus;
      if (newStatus === 'completed') task.completedAt = new Date().toISOString();
    }
    return data;
  });
  H.notify(`Task moved to ${newStatus.replace('_',' ')}`, 'success');
  navigate('my-tasks');
}

// ═══════════════════════════════════════════════
//  PAGE: CALENDAR
// ═══════════════════════════════════════════════
let calDate = new Date();
function renderCalendar() {
  const data = Store.get();
  const container = document.getElementById('calendar-content');
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const monthName = calDate.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const today = new Date();

  // Collect events
  const myTasks = data.tasks.filter(t => t.assignedTo === currentUser.id || Auth.can(currentUser,'create_task'));
  const myMeetings = data.meetings.filter(m => m.attendees.includes(currentUser.id) || m.organizer === currentUser.id);

  let cells = '';
  let day = 1;
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 7; j++) {
      const cellNum = i*7 + j;
      if (cellNum < firstDay || day > daysInMonth) {
        cells += `<div class="cal-cell other-month"><div class="cal-date" style="color:var(--text-3)">${cellNum < firstDay ? '' : day++ }</div></div>`;
        if (cellNum >= firstDay) {}
        continue;
      }
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const isToday = today.getFullYear()===year && today.getMonth()===month && today.getDate()===day;
      const dayTasks = myTasks.filter(t => t.dueDate === dateStr);
      const dayMeetings = myMeetings.filter(m => m.date === dateStr);
      cells += `
        <div class="cal-cell ${isToday?'today':''}">
          <div class="cal-date">${day}</div>
          ${dayTasks.map(t=>`<div class="cal-event task" title="${t.title}">📋 ${t.title}</div>`).join('')}
          ${dayMeetings.map(m=>`<div class="cal-event meeting" title="${m.title}">🎥 ${m.title}</div>`).join('')}
        </div>
      `;
      day++;
    }
    if (day > daysInMonth) break;
  }

  container.innerHTML = `
    <div class="fade-up">
      <div class="grid-2" style="margin-bottom:24px;align-items:start;">
        <div class="card">
          <div class="card-header" style="margin-bottom:16px">
            <button class="btn btn-ghost btn-sm" onclick="changeMonth(-1)">← Prev</button>
            <div style="font-size:16px;font-family:var(--font-head);font-weight:700">${monthName}</div>
            <button class="btn btn-ghost btn-sm" onclick="changeMonth(1)">Next →</button>
          </div>
          <div class="cal-grid">
            ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div class="cal-day-header">${d}</div>`).join('')}
            ${cells}
          </div>
        </div>

        <div>
          <div class="card" style="margin-bottom:16px">
            <div class="card-header">
              <div class="card-title">Upcoming Meetings</div>
              <button class="btn btn-primary btn-sm" onclick="openMeetingModal()">+ Schedule</button>
            </div>
            ${myMeetings.length === 0 ? '<div class="empty-state"><p>No upcoming meetings</p></div>' :
              myMeetings.map(m => `
                <div style="padding:12px 0;border-bottom:1px solid var(--border)">
                  <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="font-size:13px;font-weight:600">${m.title}</span>
                    <span style="font-size:11px;color:var(--text-3)">${m.date} ${m.time}</span>
                  </div>
                  <div style="font-size:12px;color:var(--text-3);margin-bottom:8px">${m.description}</div>
                  <a href="${m.gmeetLink}" target="_blank" class="btn btn-ghost btn-sm">
                    🎥 Join Google Meet
                  </a>
                </div>
              `).join('')}
          </div>

          <div class="card">
            <div class="card-header"><div class="card-title">Task Deadlines</div></div>
            ${myTasks.filter(t=>t.status!=='completed').sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate)).slice(0,5).map(t => `
              <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
                <span>${H.priorityIcon(t.priority)}</span>
                <div style="flex:1">
                  <div style="font-size:13px;font-weight:500">${t.title}</div>
                  <div style="font-size:11px;color:var(--text-3)">Due ${H.fmt(t.dueDate)}</div>
                </div>
                <span class="badge ${H.statusBadge(t.status)}">${t.status.replace('_',' ')}</span>
              </div>
            `).join('') || '<div class="empty-state"><p>No upcoming deadlines</p></div>'}
          </div>
        </div>
      </div>
    </div>
  `;
}

function changeMonth(dir) { calDate.setMonth(calDate.getMonth() + dir); renderCalendar(); }

// ═══════════════════════════════════════════════
//  PAGE: FILES
// ═══════════════════════════════════════════════
function renderFiles() {
  const data = Store.get();
  const container = document.getElementById('files-content');
  const canManage = Auth.can(currentUser, 'manage_files');

  const accessibleFiles = data.files.filter(f =>
    f.permissions.includes('all') || f.permissions.includes(currentUser.id) || currentUser.role === 'super_admin'
  );
  const accessibleFolders = data.folders.filter(f =>
    f.permissions.includes('all') || f.permissions.includes(currentUser.id) || currentUser.role === 'super_admin'
  );

  const fileIcons = { pdf:'📄', xlsx:'📊', docx:'📝', png:'🖼️', jpg:'🖼️', jpeg:'🖼️', mp4:'🎬', zip:'📦', csv:'📊', pptx:'📑', txt:'📃' };

  container.innerHTML = `
    <div class="fade-up">
      <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;align-items:center;">
        ${canManage ? `
          <button class="btn btn-primary" onclick="openUploadModal(null)">⬆ Upload File</button>
          <button class="btn btn-ghost" onclick="openFolderModal()">📁 New Folder</button>
        ` : ''}
        <div style="margin-left:auto;">
          <span class="badge badge-muted">💾 Files stored in browser</span>
        </div>
      </div>

      <!-- Folders -->
      <div style="margin-bottom:28px;">
        <div style="font-size:13px;font-weight:600;color:var(--text-2);margin-bottom:14px;text-transform:uppercase;letter-spacing:.5px">Folders</div>
        <div class="grid-3">
          ${accessibleFolders.map(folder => {
            const fc = data.files.filter(f => f.folderId === folder.id);
            return `
              <div class="folder-card" style="cursor:pointer;position:relative;" onclick="openFolderView('${folder.id}')">
                <span style="font-size:28px">📁</span>
                <div style="flex:1">
                  <div style="font-size:13px;font-weight:600">${folder.name}</div>
                  <div style="font-size:11px;color:var(--text-3);margin-top:2px">${fc.length} file${fc.length!==1?'s':''}</div>
                </div>
                ${canManage ? `
                  <div style="display:flex;gap:4px;">
                    <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openUploadModal('${folder.id}')" title="Upload to folder">⬆</button>
                    <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();deleteFolder('${folder.id}')" title="Delete folder" style="color:var(--danger)">🗑</button>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
          ${canManage ? `
            <div class="folder-card" style="border-style:dashed;cursor:pointer" onclick="openFolderModal()">
              <span style="font-size:28px;opacity:.4">⊕</span>
              <div style="color:var(--text-3);font-size:13px">New Folder</div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- All Files -->
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--text-2);margin-bottom:14px;text-transform:uppercase;letter-spacing:.5px">All Files</div>
        ${accessibleFiles.length === 0
          ? `<div style="color:var(--text-3);font-size:13px;padding:20px 0;">No files uploaded yet.</div>`
          : `<div class="file-grid">
            ${accessibleFiles.map(f => {
              const ext = f.name.split('.').pop().toLowerCase();
              const icon = fileIcons[ext] || '📄';
              const canDelete = canManage || f.uploadedBy === currentUser.id;
              return `
                <div class="file-card" style="position:relative;">
                  <div class="file-icon">${icon}</div>
                  <div class="file-name" title="${f.name}">${f.name}</div>
                  <div class="file-meta">${f.size}</div>
                  <div class="file-meta">${H.fmt(f.uploadedAt)}</div>
                  ${f.shared ? '<span class="badge badge-info" style="margin-top:6px;font-size:10px">Shared</span>' : ''}
                  <div style="display:flex;gap:6px;margin-top:10px;">
                    ${f.url && f.url !== '#'
                      ? f.url.startsWith('local:')
                        ? `<button class="btn btn-ghost btn-sm" onclick="downloadLocalFile('${f.id}','${f.name}')" style="flex:1;text-align:center;">⬇ Download</button>`
                        : `<a href="${f.url}" target="_blank" class="btn btn-ghost btn-sm" style="flex:1;text-align:center;text-decoration:none;">⬇ Download</a>`
                      : `<button class="btn btn-ghost btn-sm" style="flex:1;opacity:.4" disabled>⬇ No link</button>`
                    }
                    ${canDelete ? `<button class="btn btn-ghost btn-sm" onclick="deleteFile('${f.id}')" title="Delete file" style="color:var(--danger);padding:0 8px;">🗑</button>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>`
        }
      </div>
    </div>
  `;
}

// ── Folder view (click on folder → see its files) ──────────
function openFolderView(folderId) {
  const data = Store.get();
  const folder = data.folders.find(f => f.id === folderId);
  const files = data.files.filter(f => f.folderId === folderId);
  const canManage = Auth.can(currentUser, 'manage_files');
  const fileIcons = { pdf:'📄', xlsx:'📊', docx:'📝', png:'🖼️', jpg:'🖼️', jpeg:'🖼️', mp4:'🎬', zip:'📦', csv:'📊', pptx:'📑', txt:'📃' };

  document.getElementById('modal-title').textContent = `📁 ${folder?.name || 'Folder'}`;
  document.getElementById('modal-confirm').style.display = 'none';
  document.getElementById('modal-body').innerHTML = `
    <div style="margin-bottom:14px;display:flex;gap:8px;flex-wrap:wrap;">
      ${canManage ? `<button class="btn btn-primary btn-sm" onclick="closeModal();openUploadModal('${folderId}')">⬆ Upload to this folder</button>` : ''}
      <span style="font-size:12px;color:var(--text-3);align-self:center;">${files.length} file${files.length!==1?'s':''}</span>
    </div>
    ${files.length === 0
      ? `<div style="color:var(--text-3);font-size:13px;padding:20px 0;text-align:center;">No files in this folder yet.</div>`
      : `<div style="display:flex;flex-direction:column;gap:10px;">
          ${files.map(f => {
            const ext = f.name.split('.').pop().toLowerCase();
            const icon = fileIcons[ext] || '📄';
            const canDelete = canManage || f.uploadedBy === currentUser.id;
            return `
              <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:var(--radius);background:var(--bg-base);border:1px solid var(--border);">
                <span style="font-size:22px">${icon}</span>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.name}</div>
                  <div style="font-size:11px;color:var(--text-3);">${f.size} · ${H.fmt(f.uploadedAt)} · by ${H.getUserById(f.uploadedBy)?.name || 'Unknown'}</div>
                </div>
                ${f.url && f.url !== '#'
                  ? f.url.startsWith('local:')
                    ? `<button class="btn btn-ghost btn-sm" onclick="downloadLocalFile('${f.id}','${f.name}')">⬇</button>`
                    : `<a href="${f.url}" target="_blank" class="btn btn-ghost btn-sm">⬇</a>`
                  : ''}
                ${canDelete ? `<button class="btn btn-ghost btn-sm" onclick="deleteFile('${f.id}');closeModal();renderFiles();" style="color:var(--danger)">🗑</button>` : ''}
              </div>
            `;
          }).join('')}
        </div>`
    }
  `;
  openModal();
}

// ── Delete file ──────────────────────────────────
function deleteFile(fileId) {
  if (!confirm('Delete this file? This cannot be undone.')) return;
  Store.set(data => { data.files = data.files.filter(f => f.id !== fileId); return data; });
  localStorage.removeItem(`nexus_file_${fileId}`); // clean up base64 data
  H.notify('File deleted', 'info');
  renderFiles();
}

// ── Delete folder ────────────────────────────────
function deleteFolder(folderId) {
  const data = Store.get();
  const fileCount = data.files.filter(f => f.folderId === folderId).length;
  if (fileCount > 0 && !confirm(`This folder has ${fileCount} file(s). Delete folder and all its files?`)) return;
  if (fileCount === 0 && !confirm('Delete this empty folder?')) return;
  Store.set(data => {
    data.files = data.files.filter(f => f.folderId !== folderId);
    data.folders = data.folders.filter(f => f.id !== folderId);
    return data;
  });
  H.notify('Folder deleted', 'info');
  renderFiles();
}

// ── Download locally stored file ──────────────────────────────
function downloadLocalFile(fileId, fileName) {
  const base64 = localStorage.getItem(`nexus_file_${fileId}`);
  if (!base64) { H.notify('File data not found in local storage', 'error'); return; }
  const a = document.createElement('a');
  a.href = base64;
  a.download = fileName;
  a.click();
}

// ── Upload file modal (local base64 storage) ──────────
function openUploadModal(targetFolderId = null) {
  const data = Store.get();
  document.getElementById('modal-title').textContent = '⬆ Upload File';
  document.getElementById('modal-confirm').style.display = 'none'; // hide default confirm; we use custom btn
  document.getElementById('modal-body').innerHTML = `
    <div class="form-row">
      <div class="form-field">
        <label>Select File *</label>
        <input type="file" id="uf-file" style="padding:8px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-base);color:var(--text-1);width:100%;">
        <div style="font-size:11px;color:var(--text-3);margin-top:4px">Files are stored locally in your browser. Max ~10MB per file (localStorage limit).</div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-field">
        <label>Folder</label>
        <select id="uf-folder">
          <option value="">— No folder —</option>
          ${data.folders.map(f=>`<option value="${f.id}" ${f.id===targetFolderId?'selected':''}>${f.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-field">
        <label>Access</label>
        <select id="uf-access">
          <option value="all">Everyone</option>
          <option value="restricted">Restricted (you only)</option>
        </select>
      </div>
    </div>
    <div id="uf-progress" style="display:none;margin-top:12px;">
      <div style="font-size:12px;color:var(--warn);margin-bottom:6px">⟳ Uploading to cloud…</div>
      <div style="height:4px;background:var(--bg-hover);border-radius:4px;overflow:hidden;">
        <div id="uf-bar" style="height:100%;background:var(--accent);width:0%;transition:width .3s;border-radius:4px;"></div>
      </div>
    </div>
    <div id="uf-result" style="font-size:12px;margin-top:8px;min-height:16px;"></div>
    <div style="display:flex;gap:10px;margin-top:16px;">
      <button class="btn btn-primary" id="uf-submit-btn" onclick="submitFileUpload()">⬆ Upload</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>
  `;
  openModal();
}

async function submitFileUpload() {
  const fileInput = document.getElementById('uf-file');
  const file = fileInput?.files?.[0];
  if (!file) { H.notify('Please select a file', 'error'); return; }

  const btn = document.getElementById('uf-submit-btn');
  const progress = document.getElementById('uf-progress');
  const bar = document.getElementById('uf-bar');
  const result = document.getElementById('uf-result');

  btn.disabled = true;
  btn.textContent = '⟳ Reading file…';
  progress.style.display = 'block';

  // Animate bar
  let pct = 0;
  const ticker = setInterval(() => { pct = Math.min(pct + 12, 85); bar.style.width = pct + '%'; }, 150);

  try {
    // Store file as base64 in localStorage — works offline, no CORS issues
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result); // data:type;base64,xxx
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

    clearInterval(ticker);
    bar.style.width = '100%';

    const fileId = H.uid();
    const ext = file.name.split('.').pop().toLowerCase();
    const sizeKB = file.size / 1024;
    const sizeStr = sizeKB > 1024 ? `${(sizeKB/1024).toFixed(1)} MB` : `${Math.round(sizeKB)} KB`;

    // Save base64 data separately keyed by fileId (avoids bloating main store)
    try { localStorage.setItem(`nexus_file_${fileId}`, base64); } catch(e) {
      throw new Error('Storage quota exceeded — delete some files or use smaller files');
    }

    Store.set(data => {
      data.files.push({
        id: fileId,
        name: file.name,
        type: ext,
        size: sizeStr,
        folderId: document.getElementById('uf-folder').value || null,
        uploadedBy: currentUser.id,
        uploadedAt: new Date().toISOString().split('T')[0],
        permissions: [document.getElementById('uf-access').value === 'all' ? 'all' : currentUser.id],
        url: `local:${fileId}`, // sentinel for local storage
        shared: document.getElementById('uf-access').value === 'all'
      });
      return data;
    });

    result.innerHTML = `<span style="color:var(--success)">✓ Saved locally! File is available for download.</span>`;
    btn.textContent = '✓ Done';
    H.notify(`${file.name} uploaded successfully!`, 'success');
    setTimeout(() => { closeModal(); renderFiles(); }, 1200);

  } catch (err) {
    clearInterval(ticker);
    bar.style.width = '0%';
    progress.style.display = 'none';
    btn.disabled = false;
    btn.textContent = '⬆ Retry Upload';
    result.innerHTML = `<span style="color:var(--danger)">✗ ${err.message}</span>`;
    H.notify('Upload failed — ' + err.message, 'error');
  }
}

// ═══════════════════════════════════════════════
//  PAGE: CHAT
// ═══════════════════════════════════════════════
let activeChatWith = null;
let chatType = 'private';

function renderChat() {
  const data = Store.get();
  const canPublic = Auth.can(currentUser, 'public_chat');
  const container = document.getElementById('chat-content');
  const otherUsers = data.users.filter(u => u.id !== currentUser.id && u.active);

  container.innerHTML = `
    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab(this,'chat-private');chatType='private';">Private Chat</button>
      <button class="tab-btn" onclick="switchTab(this,'chat-public');chatType='public';renderPublicChat();">Public Channel</button>
    </div>
    <div id="chat-private" class="tab-pane active">
      <div class="chat-layout">
        <div class="chat-sidebar">
          <div style="padding:14px 16px;border-bottom:1px solid var(--border);">
            <div style="font-size:13px;font-weight:600">Direct Messages</div>
          </div>
          ${otherUsers.map(u => {
            const msgs = data.messages.filter(m =>
              m.type === 'private' && ((m.from===currentUser.id&&m.to===u.id)||(m.from===u.id&&m.to===currentUser.id))
            );
            const last = msgs[msgs.length-1];
            return `
              <div class="chat-contact ${activeChatWith===u.id?'active':''}" onclick="openChat('${u.id}')">
                <div class="avatar">${u.avatar}</div>
                <div class="chat-contact-info">
                  <div class="cname">${u.name}</div>
                  <div class="clast">${last ? last.text.slice(0,30)+'…' : 'No messages yet'}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="chat-main" id="chat-main-area">
          <div style="flex:1;display:grid;place-items:center;color:var(--text-3)">
            <div style="text-align:center">
              <div style="font-size:36px;margin-bottom:12px">◉</div>
              <div>Select a conversation</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div id="chat-public" class="tab-pane">
      <div id="public-chat-area"></div>
    </div>
  `;

  if (activeChatWith) openChat(activeChatWith);
}

function openChat(userId) {
  activeChatWith = userId;
  const data = Store.get();
  const user = H.getUserById(userId);
  const msgs = data.messages.filter(m =>
    m.type === 'private' && ((m.from===currentUser.id&&m.to===userId)||(m.from===userId&&m.to===currentUser.id))
  ).sort((a,b) => new Date(a.time)-new Date(b.time));

  // Update sidebar active state
  document.querySelectorAll('.chat-contact').forEach(c => c.classList.remove('active'));
  const activeContact = document.querySelector(`[onclick="openChat('${userId}')"]`);
  if (activeContact) activeContact.classList.add('active');

  const area = document.getElementById('chat-main-area');
  area.innerHTML = `
    <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;">
      <div class="avatar">${user?.avatar}</div>
      <div>
        <div style="font-size:14px;font-weight:600">${user?.name}</div>
        <div style="font-size:11px;color:var(--text-3)">${user?.position}</div>
      </div>
    </div>
    <div class="chat-messages" id="msg-list">
      ${msgs.length === 0 ? `<div class="empty-state"><p>Start a conversation with ${user?.name}</p></div>` :
        msgs.map(m => `
          <div class="msg-bubble ${m.from===currentUser.id?'me':'them'}">
            <div class="bubble-text">${m.text}</div>
            <div class="bubble-meta">${H.ago(m.time)}</div>
          </div>
        `).join('')}
    </div>
    <div class="chat-input-bar">
      <input type="text" id="chat-input" placeholder="Type a message..." onkeydown="if(event.key==='Enter')sendMessage('${userId}')">
      <button class="btn btn-primary btn-sm" onclick="sendMessage('${userId}')">Send</button>
    </div>
  `;
  const msgList = document.getElementById('msg-list');
  if (msgList) msgList.scrollTop = msgList.scrollHeight;
}

function sendMessage(toId) {
  const input = document.getElementById('chat-input');
  const text = input?.value?.trim();
  if (!text) return;
  Store.set(data => {
    data.messages.push({
      id: H.uid(), type: 'private',
      from: currentUser.id, to: toId,
      text, time: new Date().toISOString(), read: false
    });
    return data;
  });
  input.value = '';
  openChat(toId);
}

function renderPublicChat() {
  const data = Store.get();
  const canPost = Auth.can(currentUser, 'public_chat');
  const pubMsgs = data.messages.filter(m=>m.type==='public').sort((a,b)=>new Date(a.time)-new Date(b.time));
  const area = document.getElementById('public-chat-area');
  if (!area) return;
  area.innerHTML = `
    <div class="card" style="height:500px;display:flex;flex-direction:column;">
      <div class="card-header" style="flex-shrink:0">
        <div class="card-title">📢 Public Announcements Channel</div>
        <span class="badge badge-info">${canPost?'Admin':'Read-only'}</span>
      </div>
      <div style="flex:1;overflow-y:auto;padding:0 0 16px;" id="pub-msg-list">
        ${pubMsgs.map(m => {
          const u = H.getUserById(m.from);
          return `
            <div style="padding:12px 0;border-bottom:1px solid var(--border)">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <div class="avatar">${u?.avatar||'?'}</div>
                <span style="font-size:13px;font-weight:600">${u?.name||'Unknown'}</span>
                <span class="badge ${u?.role==='super_admin'?'badge-info':'badge-success'}" style="font-size:10px">${u?.role?.replace('_',' ')}</span>
                <span style="font-size:11px;color:var(--text-3);margin-left:auto">${H.ago(m.time)}</span>
              </div>
              <p style="font-size:13px;color:var(--text-1);line-height:1.6;padding-left:40px">${m.text}</p>
            </div>
          `;
        }).join('')}
      </div>
      ${canPost ? `
        <div style="display:flex;gap:10px;padding-top:16px;border-top:1px solid var(--border);flex-shrink:0">
          <input type="text" id="pub-chat-input" placeholder="Broadcast message to all..." onkeydown="if(event.key==='Enter')sendPublicMessage()">
          <button class="btn btn-primary" onclick="sendPublicMessage()">Broadcast</button>
        </div>
      ` : '<div style="font-size:12px;color:var(--text-3);padding-top:12px;border-top:1px solid var(--border)">Only managers and admins can post to public channel.</div>'}
    </div>
  `;
}

function sendPublicMessage() {
  const input = document.getElementById('pub-chat-input');
  const text = input?.value?.trim();
  if (!text) return;
  Store.set(data => {
    data.messages.push({ id: H.uid(), type:'public', from:currentUser.id, to:null, text, time:new Date().toISOString(), read:false });
    return data;
  });
  input.value = '';
  renderPublicChat();
}

// ═══════════════════════════════════════════════
//  PAGE: TASK CREATE
// ═══════════════════════════════════════════════
function renderTaskCreate() {
  if (!Auth.can(currentUser, 'create_task')) { H.notify('Access denied','error'); navigate('my-tasks'); return; }
  const data = Store.get();
  const container = document.getElementById('taskcreate-content');
  // All active users (employees + managers) can be assigned tasks
  const allAssignable = data.users.filter(u => u.active && u.role !== 'super_admin');

  function buildAssigneeOptions(filterTeamIds = null) {
    const pool = filterTeamIds
      ? allAssignable.filter(u => filterTeamIds.includes(u.id))
      : allAssignable;
    if (!pool.length) return '<option disabled>No active members found</option>';
    return pool.map(u=>`<option value="${u.id}">${u.name} — ${u.position} (${u.department})</option>`).join('');
  }

  container.innerHTML = `
    <div class="fade-up" style="max-width:760px;">
      <div class="card">
        <div class="form-row cols-2">
          <div class="form-field">
            <label>Task Title *</label>
            <input type="text" id="tc-title" placeholder="Enter task name...">
          </div>
          <div class="form-field">
            <label>Project</label>
            <select id="tc-project" onchange="onTaskProjectChange()">
              <option value="">— No Project —</option>
              ${data.projects.map(p=>`<option value="${p.id}" data-team='${JSON.stringify(p.teamIds||[])}'>${p.code} — ${p.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>Description</label>
            <textarea id="tc-desc" placeholder="Describe what needs to be done..." rows="4"></textarea>
          </div>
        </div>
        <div class="form-row cols-2">
          <div class="form-field">
            <label>Assign To * <span id="tc-assign-hint" style="font-size:10px;color:var(--text-3);font-weight:400">(all active members)</span></label>
            <select id="tc-assignee">
              <option value="">Select member...</option>
              ${buildAssigneeOptions()}
            </select>
          </div>
          <div class="form-field">
            <label>Priority</label>
            <select id="tc-priority">
              <option value="low">🟢 Low</option>
              <option value="medium" selected>🟡 Medium</option>
              <option value="high">🟠 High</option>
              <option value="critical">🔴 Critical</option>
            </select>
          </div>
        </div>
        <div class="form-row cols-2">
          <div class="form-field">
            <label>Start Date</label>
            <input type="date" id="tc-start">
          </div>
          <div class="form-field">
            <label>Due Date *</label>
            <input type="date" id="tc-due">
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>Tags (comma separated)</label>
            <input type="text" id="tc-tags" placeholder="design, frontend, backend...">
          </div>
        </div>
      </div>

      <!-- ── Subtasks ── -->
      <div class="card" style="margin-top:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <div>
            <div style="font-size:14px;font-weight:700">Subtasks</div>
            <div style="font-size:12px;color:var(--text-3);margin-top:2px">Break the task into smaller steps</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="addSubtaskRow()">+ Add Subtask</button>
        </div>
        <div id="subtask-list" style="display:flex;flex-direction:column;gap:8px;"></div>
        <div id="subtask-empty" style="font-size:12px;color:var(--text-3);padding:10px 0;">No subtasks added yet — click "+ Add Subtask" to add one.</div>
      </div>

      <div style="display:flex;gap:10px;margin-top:16px;">
        <button class="btn btn-primary" onclick="submitTaskCreate()">✓ Create & Notify</button>
        <button class="btn btn-ghost" onclick="navigate('my-tasks')">Cancel</button>
      </div>
    </div>
  `;
}

function onTaskProjectChange() {
  const data = Store.get();
  const sel = document.getElementById('tc-project');
  const opt = sel.options[sel.selectedIndex];
  const assignSel = document.getElementById('tc-assignee');
  const hint = document.getElementById('tc-assign-hint');
  const allAssignable = data.users.filter(u => u.active && u.role !== 'super_admin');

  let pool = allAssignable;
  if (sel.value) {
    const project = data.projects.find(p => p.id === sel.value);
    if (project && project.teamIds && project.teamIds.length > 0) {
      pool = allAssignable.filter(u => project.teamIds.includes(u.id));
      hint.textContent = `(${pool.length} project member${pool.length!==1?'s':''})`;
    } else {
      hint.textContent = '(no team assigned — showing all)';
    }
  } else {
    hint.textContent = '(all active members)';
  }

  assignSel.innerHTML = '<option value="">Select member...</option>' +
    (pool.length
      ? pool.map(u=>`<option value="${u.id}">${u.name} — ${u.position} (${u.department})</option>`).join('')
      : '<option disabled>No members found</option>');
}

// ── Subtask row management ──────────────────────
let _subtaskRows = [];
function addSubtaskRow() {
  const id = H.uid();
  _subtaskRows.push(id);
  const list = document.getElementById('subtask-list');
  const empty = document.getElementById('subtask-empty');
  if (empty) empty.style.display = 'none';
  const row = document.createElement('div');
  row.id = `strow-${id}`;
  row.style.cssText = 'display:flex;align-items:center;gap:8px;';
  row.innerHTML = `
    <input type="checkbox" id="stcheck-${id}" style="width:16px;height:16px;flex-shrink:0;cursor:pointer" title="Mark complete">
    <input type="text" id="sttitle-${id}" placeholder="Subtask description..." style="flex:1;padding:8px 10px;border-radius:var(--radius);border:1px solid var(--border);background:var(--bg-base);color:var(--text-1);font-size:13px;">
    <button onclick="removeSubtaskRow('${id}')" style="color:var(--danger);font-size:16px;line-height:1;padding:4px 6px;cursor:pointer;background:none;border:none;" title="Remove">✕</button>
  `;
  list.appendChild(row);
}
function removeSubtaskRow(id) {
  document.getElementById(`strow-${id}`)?.remove();
  _subtaskRows = _subtaskRows.filter(r => r !== id);
  if (_subtaskRows.length === 0) {
    const empty = document.getElementById('subtask-empty');
    if (empty) empty.style.display = '';
  }
}

function submitTaskCreate() {
  const title = document.getElementById('tc-title').value.trim();
  const assignee = document.getElementById('tc-assignee').value;
  const due = document.getElementById('tc-due').value;
  if (!title || !assignee || !due) { H.notify('Please fill required fields (Title, Assignee, Due Date)','error'); return; }

  // Collect subtasks
  const subtasks = _subtaskRows.map(id => ({
    id,
    title: document.getElementById(`sttitle-${id}`)?.value.trim() || '',
    done: document.getElementById(`stcheck-${id}`)?.checked || false
  })).filter(s => s.title);

  const task = {
    id: H.uid(), title,
    projectId: document.getElementById('tc-project').value || null,
    description: document.getElementById('tc-desc').value,
    assignedTo: assignee, createdBy: currentUser.id,
    priority: document.getElementById('tc-priority').value,
    status: 'todo',
    startDate: document.getElementById('tc-start').value,
    dueDate: due, completedAt: null,
    reportingManagerId: currentUser.id,
    tags: document.getElementById('tc-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
    subtasks,
    createdAt: new Date().toISOString().split('T')[0]
  };
  _subtaskRows = [];
  Store.set(data => { data.tasks.push(task); return data; });
  H.notify(`Task "${title}" created and assigned to ${H.getUserById(assignee)?.name}!`, 'success');
  navigate('projects');
}

// ═══════════════════════════════════════════════
//  PAGE: PROJECT CREATE
// ═══════════════════════════════════════════════
function renderProjectCreate() {
  if (!Auth.can(currentUser, 'create_project')) { H.notify('Access denied','error'); navigate('projects'); return; }
  const data = Store.get();
  const managers = data.users.filter(u => (u.role === 'manager' || u.role === 'super_admin') && u.active);
  const employees = data.users.filter(u => u.active); // all active users can be team members
  const container = document.getElementById('projectcreate-content');

  container.innerHTML = `
    <div class="fade-up" style="max-width:760px;">
      <div class="card">
        <div class="form-row cols-2">
          <div class="form-field">
            <label>Project Name *</label>
            <input type="text" id="pc-name" placeholder="e.g. Platform Redesign 2025">
          </div>
          <div class="form-field">
            <label>Project Code *</label>
            <input type="text" id="pc-code" placeholder="e.g. PRD-2025">
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>Description</label>
            <textarea id="pc-desc" rows="3" placeholder="Describe the project scope..."></textarea>
          </div>
        </div>
        <div class="form-row cols-2">
          <div class="form-field">
            <label>Project Manager *</label>
            <select id="pc-manager">
              <option value="">Select manager...</option>
              ${managers.map(u=>`<option value="${u.id}">${u.name} — ${u.position}</option>`).join('')}
            </select>
          </div>
          <div class="form-field">
            <label>Priority</label>
            <select id="pc-priority">
              <option value="low">🟢 Low</option>
              <option value="medium" selected>🟡 Medium</option>
              <option value="high">🟠 High</option>
            </select>
          </div>
        </div>
        <div class="form-row cols-2">
          <div class="form-field">
            <label>Start Date</label>
            <input type="date" id="pc-start">
          </div>
          <div class="form-field">
            <label>End Date *</label>
            <input type="date" id="pc-end">
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>Objectives (one per line)</label>
            <textarea id="pc-obj" rows="3" placeholder="Objective 1&#10;Objective 2&#10;Objective 3"></textarea>
          </div>
        </div>

        <!-- ✅ Checkbox-based team member picker -->
        <div class="form-row">
          <div class="form-field">
            <label>Team Members</label>
            <div style="border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-base);max-height:200px;overflow-y:auto;padding:10px 12px;">
              ${employees.length === 0
                ? `<div style="color:var(--text-3);font-size:13px;">No active users found</div>`
                : employees.map(u => `
                  <label style="display:flex;align-items:center;gap:10px;padding:6px 4px;cursor:pointer;border-radius:4px;transition:background .15s" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
                    <input type="checkbox" value="${u.id}" class="pc-member-cb" style="width:15px;height:15px;flex-shrink:0;cursor:pointer">
                    <div class="avatar" style="width:28px;height:28px;font-size:11px;flex-shrink:0">${u.avatar}</div>
                    <div>
                      <div style="font-size:13px;font-weight:600">${u.name}</div>
                      <div style="font-size:11px;color:var(--text-3)">${u.position} · ${u.department}</div>
                    </div>
                    <span class="badge ${u.role==='super_admin'?'badge-info':u.role==='manager'?'badge-success':'badge-muted'}" style="margin-left:auto;font-size:10px">${u.role.replace('_',' ')}</span>
                  </label>
                `).join('')
              }
            </div>
            <div style="font-size:11px;color:var(--text-3);margin-top:5px">Click checkboxes to select team members</div>
          </div>
        </div>

        <div style="display:flex;gap:10px;margin-top:8px;">
          <button class="btn btn-primary" onclick="submitProjectCreate()">✓ Create Project</button>
          <button class="btn btn-ghost" onclick="navigate('projects')">Cancel</button>
        </div>
      </div>
    </div>
  `;
}

function submitProjectCreate() {
  const name = document.getElementById('pc-name').value.trim();
  const code = document.getElementById('pc-code').value.trim();
  const manager = document.getElementById('pc-manager').value;
  const end = document.getElementById('pc-end').value;
  if (!name||!code||!manager||!end) { H.notify('Please fill required fields (Name, Code, Manager, End Date)','error'); return; }
  // Collect checked team members
  const teamIds = Array.from(document.querySelectorAll('.pc-member-cb:checked')).map(cb => cb.value);
  const project = {
    id: H.uid(), name, code,
    description: document.getElementById('pc-desc').value,
    status: 'planning', priority: document.getElementById('pc-priority').value,
    startDate: document.getElementById('pc-start').value, endDate: end,
    managerId: manager, teamIds,
    createdBy: currentUser.id, createdAt: new Date().toISOString().split('T')[0],
    objectives: document.getElementById('pc-obj').value.split('\n').map(o=>o.trim()).filter(Boolean),
    completion: 0
  };
  Store.set(data => { data.projects.push(project); return data; });
  H.notify(`Project "${name}" created with ${teamIds.length} team member(s)!`, 'success');
  navigate('projects');
}

// ═══════════════════════════════════════════════
//  PAGE: USER MANAGEMENT
// ═══════════════════════════════════════════════
function renderUsers() {
  if (currentUser.role !== 'super_admin') { navigate('dashboard'); return; }
  const data = Store.get();
  const container = document.getElementById('users-content');
  container.innerHTML = `
    <div class="fade-up">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
        <div>
          <div style="font-size:14px;color:var(--text-2)">${data.users.length} total accounts</div>
        </div>
        <button class="btn btn-primary" onclick="openAddUserModal()">+ Create User</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>User</th><th>Username</th><th>Role</th><th>Department</th>
            <th>Reports To</th><th>Status</th><th>Joined</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${data.users.map(u => {
              const manager = u.managerId ? H.getUserById(u.managerId) : null;
              return `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div class="avatar">${u.avatar}</div>
                      <div>
                        <div style="font-weight:600">${u.name}</div>
                        <div style="font-size:11px;color:var(--text-3)">${u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style="font-family:var(--font-mono);font-size:12px">${u.username}</td>
                  <td><span class="badge ${u.role==='super_admin'?'badge-info':u.role==='manager'?'badge-success':'badge-muted'}">${u.role.replace('_',' ')}</span></td>
                  <td>${u.department}</td>
                  <td>${manager?.name||'—'}</td>
                  <td><span class="badge ${u.active?'badge-success':'badge-danger'}">${u.active?'Active':'Inactive'}</span></td>
                  <td style="font-size:12px;color:var(--text-3)">${H.fmt(u.createdAt)}</td>
                  <td>
                    <div style="display:flex;gap:6px">
                      <button class="btn btn-ghost btn-sm" onclick="openEditUserModal('${u.id}')">✏️ Edit</button>
                      <button class="btn btn-danger btn-sm" onclick="toggleUserStatus('${u.id}')">${u.active?'🔒 Deactivate':'🔓 Activate'}</button>
                      ${u.id !== currentUser.id ? `<button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')" title="Delete user">🗑️</button>` : ''}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ─── User CRUD ────────────────────────────────
function openAddUserModal(editId = null) {
  const data = Store.get();
  const user = editId ? data.users.find(u=>u.id===editId) : null;
  const managers = data.users.filter(u=>u.role!=='employee');
  document.getElementById('modal-title').textContent = editId ? 'Edit User' : 'Create New User';
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <div class="form-row cols-2">
      <div class="form-field"><label>Full Name *</label><input id="um-name" value="${user?.name||''}" placeholder="John Doe"></div>
      <div class="form-field"><label>Username *</label><input id="um-username" value="${user?.username||''}" placeholder="john.doe"></div>
    </div>
    <div class="form-row cols-2">
      <div class="form-field"><label>Email *</label><input id="um-email" type="email" value="${user?.email||''}" placeholder="john@company.co"></div>
      <div class="form-field"><label>Phone</label><input id="um-phone" value="${user?.phone||''}" placeholder="+1 555 0000"></div>
    </div>
    <div class="form-row cols-2">
      <div class="form-field"><label>${editId?'New Password (leave blank to keep)':'Password *'}</label><input id="um-password" type="password" placeholder="Min 8 chars"></div>
      <div class="form-field"><label>Role *</label>
        <select id="um-role">
          ${['employee','manager','super_admin'].map(r=>`<option value="${r}" ${user?.role===r?'selected':''}>${r.replace('_',' ')}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row cols-2">
      <div class="form-field"><label>Position *</label><input id="um-position" value="${user?.position||''}" placeholder="Senior Developer"></div>
      <div class="form-field"><label>Department</label><input id="um-dept" value="${user?.department||''}" placeholder="Engineering"></div>
    </div>
    <div class="form-row cols-2">
      <div class="form-field"><label>Division</label><input id="um-div" value="${user?.division||''}" placeholder="Technology"></div>
      <div class="form-field"><label>Reports To</label>
        <select id="um-manager">
          <option value="">— None —</option>
          ${managers.map(m=>`<option value="${m.id}" ${user?.managerId===m.id?'selected':''}>${m.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row cols-2">
      <div class="form-field"><label>Avatar Initials *</label><input id="um-avatar" maxlength="2" value="${user?.avatar||''}" placeholder="JD"></div>
    </div>
  `;
  document.getElementById('modal-confirm').onclick = () => saveUser(editId);
  openModal();
}

function saveUser(editId) {
  const name = document.getElementById('um-name').value.trim();
  const username = document.getElementById('um-username').value.trim();
  const email = document.getElementById('um-email').value.trim();
  const password = document.getElementById('um-password').value;
  const role = document.getElementById('um-role').value;
  const position = document.getElementById('um-position').value.trim();
  if (!name||!username||!email||!role||!position) { H.notify('Fill required fields','error'); return; }
  if (!editId && !password) { H.notify('Password required for new users','error'); return; }
  Store.set(data => {
    if (editId) {
      const u = data.users.find(u=>u.id===editId);
      if (u) {
        u.name=name; u.username=username; u.email=email; u.role=role;
        u.position=position; u.department=document.getElementById('um-dept').value;
        u.division=document.getElementById('um-div').value;
        u.managerId=document.getElementById('um-manager').value||null;
        u.avatar=document.getElementById('um-avatar').value.toUpperCase();
        u.phone=document.getElementById('um-phone').value;
        if (password) u.password=password;
      }
    } else {
      data.users.push({
        id: H.uid(), name, username, email,
        password: password,
        role, position,
        department: document.getElementById('um-dept').value,
        division: document.getElementById('um-div').value,
        managerId: document.getElementById('um-manager').value||null,
        avatar: document.getElementById('um-avatar').value.toUpperCase()||name.slice(0,2).toUpperCase(),
        phone: document.getElementById('um-phone').value,
        active: true,
        createdAt: new Date().toISOString().split('T')[0]
      });
    }
    return data;
  });
  closeModal();
  H.notify(editId ? 'User updated!' : 'User created!', 'success');
  renderUsers();
}

function openEditUserModal(id) { openAddUserModal(id); }

function toggleUserStatus(userId) {
  Store.set(data => {
    const u = data.users.find(u=>u.id===userId);
    if (u) u.active = !u.active;
    return data;
  });
  H.notify('User status updated', 'success');
  const currentPage = document.querySelector('.page.active')?.id;
  if (currentPage === 'page-users') renderUsers();
  else renderOrganization();
}

function deleteUser(userId) {
  if (userId === currentUser.id) { H.notify("You can't delete yourself", 'error'); return; }
  const u = H.getUserById(userId);
  if (!confirm(`Delete ${u?.name}? This action cannot be undone.`)) return;
  Store.set(data => {
    data.users = data.users.filter(u => u.id !== userId);
    // Remove from project teams
    data.projects.forEach(p => { p.teamIds = p.teamIds.filter(id => id !== userId); });
    // Unassign tasks
    data.tasks.forEach(t => { if (t.assignedTo === userId) t.assignedTo = null; });
    // Update manager references
    data.users.forEach(u => { if (u.managerId === userId) u.managerId = null; });
    return data;
  });
  H.notify('User deleted', 'success');
  const currentPage = document.querySelector('.page.active')?.id;
  if (currentPage === 'page-users') renderUsers();
  else renderOrganization();
}

// ═══════════════════════════════════════════════
//  PAGE: SETTINGS
// ═══════════════════════════════════════════════
function renderSettings() {
  const data = Store.get();
  const u = H.getUserById(currentUser.id);
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

  const allSkills = {
    'Technical': ['JavaScript','Python','Java','React','Node.js','SQL','AWS','Docker','Kubernetes','TypeScript','Go','Rust','C++','Swift','Flutter'],
    'Design': ['Figma','Adobe XD','UI/UX','Prototyping','User Research','Illustration','Motion Design','Brand Identity'],
    'Management': ['Agile/Scrum','Project Planning','Risk Management','Stakeholder Management','Team Leadership','OKRs','Budgeting'],
    'Communication': ['Technical Writing','Presentation','Negotiation','Mentoring','Client Relations','Public Speaking'],
    'Data': ['Data Analysis','Machine Learning','Power BI','Tableau','Excel','Statistics','Data Engineering']
  };

  const userSkills = u.skills || [];

  const container = document.getElementById('settings-content');
  container.innerHTML = `
    <div class="settings-grid fade-up">
      <!-- Settings Nav -->
      <div>
        <div class="card" style="padding:8px;">
          <div class="settings-nav">
            <div class="settings-nav-item active" onclick="switchSettingsTab(this,'s-profile')">👤 Profile</div>
            <div class="settings-nav-item" onclick="switchSettingsTab(this,'s-theme')">🎨 Appearance</div>
            <div class="settings-nav-item" onclick="switchSettingsTab(this,'s-skills')">⚡ Skills & Expertise</div>
            <div class="settings-nav-item" onclick="switchSettingsTab(this,'s-career')">📈 Career Details</div>
            <div class="settings-nav-item" onclick="switchSettingsTab(this,'s-security')">🔒 Security</div>
            ${currentUser.role === 'super_admin' ? `<div class="settings-nav-item" onclick="switchSettingsTab(this,'s-cloud')">☁️ Cloud Storage</div>` : ''}
          </div>
        </div>
      </div>

      <!-- Settings Content -->
      <div>
        <!-- Profile -->
        <div id="s-profile" class="settings-section active">
          <div class="card">
            <span class="settings-label">Personal Information</span>
            <div style="display:flex;align-items:center;gap:20px;margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid var(--border)">
              <div class="avatar xl" style="font-size:26px">${u.avatar}</div>
              <div>
                <div style="font-size:18px;font-weight:700;font-family:var(--font-head)">${u.name}</div>
                <div style="font-size:13px;color:var(--text-3);margin-top:2px">${u.position} · ${u.department}</div>
                <div style="margin-top:8px;">
                  <span class="badge ${u.role==='super_admin'?'badge-info':u.role==='manager'?'badge-success':'badge-muted'}">${u.role.replace('_',' ')}</span>
                  <span class="badge ${u.active?'badge-success':'badge-danger'}" style="margin-left:4px">${u.active?'Active':'Inactive'}</span>
                </div>
              </div>
            </div>
            <div class="form-row cols-2">
              <div class="form-field"><label>Full Name</label><input id="sp-name" value="${u.name}"></div>
              <div class="form-field"><label>Username</label><input value="${u.username}" disabled style="opacity:.6"></div>
            </div>
            <div class="form-row cols-2">
              <div class="form-field"><label>Email</label><input id="sp-email" type="email" value="${u.email}"></div>
              <div class="form-field"><label>Phone</label><input id="sp-phone" value="${u.phone||''}"></div>
            </div>
            <div class="form-row">
              <div class="form-field"><label>Bio / About Me</label>
                <textarea id="sp-bio" rows="3" placeholder="Tell your team about yourself...">${u.bio||''}</textarea>
              </div>
            </div>
            <div class="form-row">
              <div class="form-field"><label>LinkedIn URL</label><input id="sp-linkedin" value="${u.linkedin||''}" placeholder="https://linkedin.com/in/yourname"></div>
            </div>
            <button class="btn btn-primary" onclick="saveProfileSettings()">✓ Save Profile</button>
          </div>
        </div>

        <!-- Appearance / Theme -->
        <div id="s-theme" class="settings-section">
          <div class="card">
            <span class="settings-label">Theme & Appearance</span>
            <div style="margin-bottom:24px;">
              <div style="font-size:13px;font-weight:600;margin-bottom:14px">Color Theme</div>
              <div class="grid-2" style="max-width:480px;gap:14px;">
                <div class="theme-option ${currentTheme==='light'?'active':''}" onclick="selectTheme('light',this)">
                  <div style="height:64px;border-radius:8px;background:#f0f2f5;border:1px solid #e4e7ed;display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:10px">
                    <div style="width:20px;height:20px;border-radius:4px;background:#fff;border:1px solid #e4e7ed"></div>
                    <div style="width:60px;height:10px;border-radius:4px;background:#e4e7ed"></div>
                    <div style="width:16px;height:16px;border-radius:50%;background:#2563eb"></div>
                  </div>
                  <div style="font-size:13px;font-weight:600">☀️ Light Mode</div>
                  <div style="font-size:11px;color:var(--text-3);margin-top:2px">Clean & bright interface</div>
                </div>
                <div class="theme-option ${currentTheme==='dark'?'active':''}" onclick="selectTheme('dark',this)">
                  <div style="height:64px;border-radius:8px;background:#0e1117;border:1px solid #2a3450;display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:10px">
                    <div style="width:20px;height:20px;border-radius:4px;background:#1c2333;border:1px solid #2a3450"></div>
                    <div style="width:60px;height:10px;border-radius:4px;background:#2a3450"></div>
                    <div style="width:16px;height:16px;border-radius:50%;background:#4f8ef7"></div>
                  </div>
                  <div style="font-size:13px;font-weight:600">🌙 Dark Mode</div>
                  <div style="font-size:11px;color:var(--text-3);margin-top:2px">Easy on the eyes</div>
                </div>
              </div>
            </div>
            <div style="padding:16px;background:var(--bg-base);border-radius:var(--radius);border:1px solid var(--border)">
              <div style="font-size:12px;font-weight:600;margin-bottom:4px">Current theme: <span style="color:var(--accent)">${currentTheme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span></div>
              <div style="font-size:12px;color:var(--text-3)">Theme preference is saved to your profile and synced across sessions.</div>
            </div>
          </div>
        </div>

        <!-- Skills -->
        <div id="s-skills" class="settings-section">
          <div class="card">
            <span class="settings-label">Skills & Expertise</span>
            <p style="font-size:13px;color:var(--text-2);margin-bottom:20px;line-height:1.6">Select your skills. Managers use this information for optimal task and role assignment.</p>
            ${Object.entries(allSkills).map(([cat, skills]) => `
              <div style="margin-bottom:20px">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text-3);margin-bottom:10px">${cat}</div>
                <div>
                  ${skills.map(skill => `
                    <span class="skill-tag ${userSkills.includes(skill)?'selected':''}" onclick="toggleSkill(this,'${skill}')">${skill}</span>
                  `).join('')}
                </div>
              </div>
            `).join('')}
            <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
              <div style="font-size:12px;color:var(--text-3);margin-bottom:12px">Selected: <strong style="color:var(--accent)" id="skill-count">${userSkills.length}</strong> skills</div>
              <button class="btn btn-primary" onclick="saveSkills()">✓ Save Skills</button>
            </div>
          </div>
        </div>

        <!-- Career Details -->
        <div id="s-career" class="settings-section">
          <div class="card">
            <span class="settings-label">Career & Professional Details</span>
            <div class="form-row cols-2">
              <div class="form-field"><label>Current Position</label><input id="sc-position" value="${u.position||''}"></div>
              <div class="form-field"><label>Department</label><input id="sc-dept" value="${u.department||''}"></div>
            </div>
            <div class="form-row cols-2">
              <div class="form-field"><label>Years of Experience</label>
                <select id="sc-exp">
                  ${['0-1 years','1-3 years','3-5 years','5-8 years','8-12 years','12+ years'].map(y => `<option ${u.experience===y?'selected':''}>${y}</option>`).join('')}
                </select>
              </div>
              <div class="form-field"><label>Employment Type</label>
                <select id="sc-emptype">
                  ${['Full-time','Part-time','Contract','Intern','Freelance'].map(t => `<option ${u.employmentType===t?'selected':''}>${t}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-field"><label>Certifications (one per line)</label>
                <textarea id="sc-certs" rows="3" placeholder="AWS Certified Developer&#10;PMP Certified">${(u.certifications||[]).join('\n')}</textarea>
              </div>
            </div>
            <div class="form-row">
              <div class="form-field"><label>Career Goals</label>
                <textarea id="sc-goals" rows="3" placeholder="What are your career aspirations...">${u.careerGoals||''}</textarea>
              </div>
            </div>
            <div class="form-row">
              <div class="form-field"><label>Availability for New Roles</label>
                <select id="sc-avail">
                  <option ${u.availability==='open'?'selected':''} value="open">🟢 Open to Opportunities</option>
                  <option ${u.availability==='happy'?'selected':''} value="happy">🟡 Happy in Current Role</option>
                  <option ${u.availability==='not_looking'?'selected':''} value="not_looking">🔴 Not Looking</option>
                </select>
              </div>
            </div>
            <button class="btn btn-primary" onclick="saveCareerSettings()">✓ Save Career Info</button>
          </div>
        </div>

        <!-- Security -->
        <div id="s-security" class="settings-section">
          <div class="card">
            <span class="settings-label">Change Password</span>
            <div class="form-row">
              <div class="form-field"><label>Current Password</label><input type="password" id="sec-old" placeholder="Enter current password"></div>
            </div>
            <div class="form-row">
              <div class="form-field"><label>New Password</label><input type="password" id="sec-new" placeholder="Min 8 characters, include uppercase & number"></div>
            </div>
            <div class="form-row">
              <div class="form-field"><label>Confirm New Password</label><input type="password" id="sec-confirm" placeholder="Re-enter new password"></div>
            </div>
            <button class="btn btn-primary" onclick="changePassword()">🔒 Update Password</button>
          </div>
        </div>

        <!-- Cloud Storage (super admin only) -->
        ${currentUser.role === 'super_admin' ? `
        <div id="s-cloud" class="settings-section">
          <div class="card">
            <span class="settings-label">GitHub Gist — Real-time Backend</span>
            <p style="font-size:13px;color:var(--text-2);line-height:1.7;margin-bottom:20px">
              All Nexus data (users, projects, tasks, messages) is synced to a private GitHub Gist.
              Every change is pushed within ~1 second. Any browser that connects with the same Gist ID
              sees live data instantly — no server, no database, no cost.
            </p>

            <!-- How-to guide -->
            <details style="margin-bottom:20px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
              <summary style="padding:12px 16px;cursor:pointer;font-size:13px;font-weight:600;background:var(--bg-base);user-select:none">
                📋 How to set up (2 minutes)
              </summary>
              <ol style="font-size:12px;color:var(--text-2);line-height:2.4;padding:14px 14px 14px 32px;margin:0;background:var(--bg-base)">
                <li>Go to <a href="https://github.com/settings/tokens/new" target="_blank" style="color:var(--accent)">github.com/settings/tokens/new</a></li>
                <li>Note: <strong>Nexus App</strong> · Expiration: <em>No expiration</em> · Scope: tick <strong>gist</strong> only → Generate</li>
                <li>Copy the token (starts with <code style="background:var(--bg-hover);padding:1px 5px;border-radius:3px">ghp_</code>)</li>
                <li>Go to <a href="https://gist.github.com" target="_blank" style="color:var(--accent)">gist.github.com</a> → New gist</li>
                <li>Filename: <code style="background:var(--bg-hover);padding:1px 5px;border-radius:3px">nexus.json</code> · Content: <code style="background:var(--bg-hover);padding:1px 5px;border-radius:3px">{}</code> → Create <strong>secret</strong> gist</li>
                <li>Copy the Gist ID from the URL (the long hash after your username)</li>
                <li>Paste both below and click <strong>Save &amp; Connect</strong></li>
              </ol>
            </details>

            <div data-gist-widget></div>
          </div>

          <!-- Danger zone -->
          <div class="card" style="margin-top:16px;border-color:var(--danger-muted,#3a1a1a)">
            <span class="settings-label" style="color:var(--danger)">Danger Zone</span>
            <p style="font-size:13px;color:var(--text-2);margin-bottom:14px">
              Reset all data back to factory defaults. This will overwrite both local storage and the connected Gist — <strong>irreversible</strong>.
            </p>
            <button class="btn btn-ghost" style="color:var(--danger);border-color:var(--danger)"
              onclick="if(confirm('Reset ALL data to defaults? This cannot be undone.'))Store.reset().then(()=>{H.notify('Data reset to defaults','info');setTimeout(()=>window.location.reload(),800)})">
              ⚠ Reset to Factory Defaults
            </button>
          </div>
        </div>
        ` : ''}
      </div>
    </div>
  `;

  // Render the Gist widget after DOM is set
  if (currentUser.role === 'super_admin') {
    const widgetEl = document.querySelector('[data-gist-widget]');
    if (widgetEl) Store.renderSettingsWidget(widgetEl);
  }
}

function switchSettingsTab(btn, sectionId) {
  document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
  btn.classList.add('active');
  const sec = document.getElementById(sectionId);
  if (sec) sec.classList.add('active');
}

function selectTheme(theme, el) {
  document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
  applyTheme(theme);
  localStorage.setItem('nexus_theme', theme);
  Store.set(data => {
    const u = data.users.find(x => x.id === currentUser?.id);
    if (u) u.theme = theme;
    return data;
  });
  H.notify(`${theme === 'dark' ? '🌙 Dark' : '☀️ Light'} mode activated!`, 'success');
  // Re-render to reflect new theme labels
  setTimeout(() => renderSettings(), 300);
}

let _pendingSkills = null;
function toggleSkill(el, skill) {
  const data = Store.get();
  const u = data.users.find(x => x.id === currentUser.id);
  if (!_pendingSkills) _pendingSkills = [...(u.skills || [])];
  el.classList.toggle('selected');
  if (el.classList.contains('selected')) {
    if (!_pendingSkills.includes(skill)) _pendingSkills.push(skill);
  } else {
    _pendingSkills = _pendingSkills.filter(s => s !== skill);
  }
  const cnt = document.getElementById('skill-count');
  if (cnt) cnt.textContent = _pendingSkills.length;
}

function saveSkills() {
  const skills = _pendingSkills || [];
  Store.set(data => {
    const u = data.users.find(x => x.id === currentUser.id);
    if (u) u.skills = skills;
    return data;
  });
  _pendingSkills = null;
  H.notify(`${skills.length} skills saved!`, 'success');
}

function saveProfileSettings() {
  const name = document.getElementById('sp-name').value.trim();
  if (!name) { H.notify('Name is required', 'error'); return; }
  Store.set(data => {
    const u = data.users.find(x => x.id === currentUser.id);
    if (u) {
      u.name = name;
      u.email = document.getElementById('sp-email').value.trim();
      u.phone = document.getElementById('sp-phone').value.trim();
      u.bio = document.getElementById('sp-bio').value.trim();
      u.linkedin = document.getElementById('sp-linkedin').value.trim();
      // Update initials avatar
      const parts = name.split(' ');
      u.avatar = (parts[0][0] + (parts[1]?.[0]||'')).toUpperCase();
    }
    return data;
  });
  // Refresh currentUser
  currentUser = Auth.current();
  renderHeader();
  H.notify('Profile updated!', 'success');
}

function saveCareerSettings() {
  Store.set(data => {
    const u = data.users.find(x => x.id === currentUser.id);
    if (u) {
      u.position = document.getElementById('sc-position').value.trim();
      u.department = document.getElementById('sc-dept').value.trim();
      u.experience = document.getElementById('sc-exp').value;
      u.employmentType = document.getElementById('sc-emptype').value;
      u.availability = document.getElementById('sc-avail').value;
      u.certifications = document.getElementById('sc-certs').value.split('\n').map(c=>c.trim()).filter(Boolean);
      u.careerGoals = document.getElementById('sc-goals').value.trim();
    }
    return data;
  });
  H.notify('Career info saved!', 'success');
}

function changePassword() {
  const oldPass = document.getElementById('sec-old').value;
  const newPass = document.getElementById('sec-new').value;
  const confirm = document.getElementById('sec-confirm').value;
  const data = Store.get();
  const u = data.users.find(x => x.id === currentUser.id);
  if (u.password !== oldPass) { H.notify('Current password is incorrect', 'error'); return; }
  if (newPass.length < 8) { H.notify('New password must be at least 8 characters', 'error'); return; }
  if (!/[A-Z]/.test(newPass)) { H.notify('Include at least one uppercase letter', 'error'); return; }
  if (!/[0-9]/.test(newPass)) { H.notify('Include at least one number', 'error'); return; }
  if (newPass !== confirm) { H.notify('Passwords do not match', 'error'); return; }
  Store.set(data => {
    const u = data.users.find(x => x.id === currentUser.id);
    if (u) u.password = newPass;
    return data;
  });
  document.getElementById('sec-old').value = '';
  document.getElementById('sec-new').value = '';
  document.getElementById('sec-confirm').value = '';
  H.notify('Password updated successfully!', 'success');
}

// ─── Modal helpers ────────────────────────────
function openModal() { document.getElementById('main-modal').classList.add('open'); }
function closeModal() {
  document.getElementById('main-modal').classList.remove('open');
  // Reset confirm button visibility for next modal use
  const confirmBtn = document.getElementById('modal-confirm');
  if (confirmBtn) confirmBtn.style.display = '';
}

// ─── Project Detail ───────────────────────────
function showProjectDetail(projId) {
  const data = Store.get();
  const p = data.projects.find(x=>x.id===projId);
  if (!p) return;
  const manager = H.getUserById(p.managerId);
  const tasks = data.tasks.filter(t=>t.projectId===projId);
  const team = p.teamIds.map(id=>H.getUserById(id)).filter(Boolean);
  document.getElementById('modal-title').textContent = p.name;
  document.getElementById('modal-confirm').style.display = 'none';
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
      <span class="badge ${H.statusBadge(p.status)}">${p.status}</span>
      <span class="badge ${H.statusBadge(p.priority)}">${H.priorityIcon(p.priority)} ${p.priority}</span>
      <span class="badge badge-muted">📅 ${H.fmt(p.startDate)} → ${H.fmt(p.endDate)}</span>
    </div>
    <p style="color:var(--text-2);font-size:13px;line-height:1.7;margin-bottom:16px">${p.description}</p>
    <div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-3);margin-bottom:6px">
        <span>Overall Progress</span><span>${p.completion}%</span>
      </div>
      <div class="progress-wrap"><div class="progress-bar" style="width:${p.completion}%"></div></div>
    </div>
    <div class="grid-2" style="margin-bottom:16px">
      <div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text-3);margin-bottom:8px">Manager</div>
        <div class="user-pill">
          <div class="pill-avatar">${manager?.avatar}</div>
          ${manager?.name}
        </div>
      </div>
      <div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text-3);margin-bottom:8px">Team (${team.length})</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${team.map(u=>`<div class="user-pill"><div class="pill-avatar">${u.avatar}</div>${u.name.split(' ')[0]}</div>`).join('')}
        </div>
      </div>
    </div>
    ${p.objectives.length ? `
      <div style="margin-bottom:16px">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text-3);margin-bottom:8px">Objectives</div>
        ${p.objectives.map(o=>`<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:13px;color:var(--text-2)">▸ ${o}</div>`).join('')}
      </div>
    ` : ''}
    <div>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text-3);margin-bottom:8px">Tasks (${tasks.length})</div>
      ${tasks.map(t => {
        const assignee = H.getUserById(t.assignedTo);
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
          <span>${H.priorityIcon(t.priority)}</span>
          <span style="flex:1;font-size:13px">${t.title}</span>
          <div class="user-pill"><div class="pill-avatar">${assignee?.avatar||'?'}</div>${assignee?.name?.split(' ')[0]||'?'}</div>
          <span class="badge ${H.statusBadge(t.status)}">${t.status.replace('_',' ')}</span>
        </div>`;
      }).join('') || '<div style="color:var(--text-3);font-size:13px">No tasks yet</div>'}
    </div>
  `;
  document.getElementById('modal-confirm').style.display = '';
  document.getElementById('modal-confirm').textContent = 'Close';
  document.getElementById('modal-confirm').onclick = closeModal;
  openModal();
}

// ─── Task Detail ──────────────────────────────
function showTaskDetail(taskId) {
  const data = Store.get();
  const t = data.tasks.find(x=>x.id===taskId);
  if (!t) return;
  const assignee = H.getUserById(t.assignedTo);
  const creator = H.getUserById(t.createdBy);
  const manager = H.getUserById(t.reportingManagerId);
  const project = data.projects.find(p=>p.id===t.projectId);
  document.getElementById('modal-title').textContent = t.title;
  document.getElementById('modal-confirm').style.display = 'none';
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
      <span class="badge ${H.statusBadge(t.status)}">${t.status.replace('_',' ')}</span>
      <span class="badge ${H.statusBadge(t.priority)}">${H.priorityIcon(t.priority)} ${t.priority}</span>
      ${project?`<span class="badge badge-muted">📁 ${project.name}</span>`:''}
    </div>
    <p style="color:var(--text-2);font-size:13px;line-height:1.7;margin-bottom:16px">${t.description||'No description provided.'}</p>
    <div class="grid-2" style="gap:16px;margin-bottom:16px">
      <div style="background:var(--bg-surface);border-radius:var(--radius);padding:14px">
        <div style="font-size:11px;color:var(--text-3);margin-bottom:4px">Assigned To</div>
        <div class="user-pill"><div class="pill-avatar">${assignee?.avatar||'?'}</div>${assignee?.name||'?'}</div>
      </div>
      <div style="background:var(--bg-surface);border-radius:var(--radius);padding:14px">
        <div style="font-size:11px;color:var(--text-3);margin-bottom:4px">Reporting Manager</div>
        <div class="user-pill"><div class="pill-avatar">${manager?.avatar||'?'}</div>${manager?.name||'?'}</div>
      </div>
    </div>
    <div class="grid-2" style="gap:16px;margin-bottom:16px">
      <div style="background:var(--bg-surface);border-radius:var(--radius);padding:14px">
        <div style="font-size:11px;color:var(--text-3);margin-bottom:4px">Timeline</div>
        <div style="font-size:13px">${H.fmt(t.startDate)} → <strong>${H.fmt(t.dueDate)}</strong></div>
      </div>
      <div style="background:var(--bg-surface);border-radius:var(--radius);padding:14px">
        <div style="font-size:11px;color:var(--text-3);margin-bottom:4px">Created By</div>
        <div class="user-pill"><div class="pill-avatar">${creator?.avatar||'?'}</div>${creator?.name||'?'}</div>
      </div>
    </div>
    ${t.tags.length ? `<div>${t.tags.map(tag=>`<span class="tag">${tag}</span>`).join('')}</div>` : ''}
    ${t.completedAt ? `<div style="margin-top:16px;padding:12px;background:var(--bg-surface);border-radius:var(--radius);border-left:3px solid var(--success)">
      <span style="font-size:12px;color:var(--success)">✓ Completed ${H.fmt(t.completedAt)}</span>
    </div>` : ''}
  `;
  document.getElementById('modal-confirm').style.display = '';
  document.getElementById('modal-confirm').textContent = 'Close';
  document.getElementById('modal-confirm').onclick = closeModal;
  openModal();
}

// ─── User Profile ─────────────────────────────
function showUserProfile(userId) {
  const u = H.getUserById(userId);
  if (!u) return;
  const data = Store.get();
  const manager = u.managerId ? H.getUserById(u.managerId) : null;
  const directReports = data.users.filter(x=>x.managerId===u.id);
  document.getElementById('modal-title').textContent = 'Employee Profile';
  document.getElementById('modal-confirm').textContent = 'Close';
  document.getElementById('modal-confirm').onclick = closeModal;
  const body = document.getElementById('modal-body');
  const skills = u.skills || [];
  const availMap = { open: '🟢 Open to Opportunities', happy: '🟡 Happy in Role', not_looking: '🔴 Not Looking' };
  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:20px;margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid var(--border)">
      <div class="avatar xl">${u.avatar}</div>
      <div style="flex:1">
        <div style="font-size:20px;font-family:var(--font-head);font-weight:700">${u.name}</div>
        <div style="color:var(--text-3);font-size:13px;margin-top:4px">${u.position}</div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
          <span class="badge ${u.role==='super_admin'?'badge-info':u.role==='manager'?'badge-success':'badge-muted'}">${u.role.replace('_',' ')}</span>
          <span class="badge badge-muted">${u.department}</span>
          <span class="badge ${u.active?'badge-success':'badge-danger'}">${u.active?'Active':'Inactive'}</span>
          ${u.availability ? `<span class="badge badge-muted" style="font-size:10px">${availMap[u.availability]||''}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="grid-2" style="gap:16px;margin-bottom:16px">
      <div><div style="font-size:11px;color:var(--text-3);margin-bottom:4px">Email</div><div style="font-size:13px">${u.email}</div></div>
      <div><div style="font-size:11px;color:var(--text-3);margin-bottom:4px">Phone</div><div style="font-size:13px">${u.phone||'—'}</div></div>
      <div><div style="font-size:11px;color:var(--text-3);margin-bottom:4px">Division</div><div style="font-size:13px">${u.division}</div></div>
      <div><div style="font-size:11px;color:var(--text-3);margin-bottom:4px">Joined</div><div style="font-size:13px">${H.fmt(u.createdAt)}</div></div>
      ${u.experience ? `<div><div style="font-size:11px;color:var(--text-3);margin-bottom:4px">Experience</div><div style="font-size:13px">${u.experience}</div></div>` : ''}
      ${u.employmentType ? `<div><div style="font-size:11px;color:var(--text-3);margin-bottom:4px">Employment</div><div style="font-size:13px">${u.employmentType}</div></div>` : ''}
    </div>
    ${u.bio ? `<div style="margin-bottom:16px;padding:12px;background:var(--bg-base);border-radius:var(--radius);border:1px solid var(--border)"><div style="font-size:11px;color:var(--text-3);margin-bottom:6px">About</div><div style="font-size:13px;color:var(--text-2);line-height:1.6">${u.bio}</div></div>` : ''}
    ${manager ? `<div style="margin-bottom:16px"><div style="font-size:11px;color:var(--text-3);margin-bottom:8px">Reports To</div>
      <div class="user-pill"><div class="pill-avatar">${manager.avatar}</div>${manager.name} — ${manager.position}</div>
    </div>` : ''}
    ${directReports.length ? `<div style="margin-bottom:16px"><div style="font-size:11px;color:var(--text-3);margin-bottom:8px">Direct Reports (${directReports.length})</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${directReports.map(r=>`<div class="user-pill"><div class="pill-avatar">${r.avatar}</div>${r.name}</div>`).join('')}
      </div>
    </div>` : ''}
    ${skills.length ? `
      <div style="margin-bottom:16px">
        <div style="font-size:11px;color:var(--text-3);margin-bottom:8px">Skills (${skills.length})</div>
        <div>${skills.map(s=>`<span class="skill-tag selected" style="cursor:default">${s}</span>`).join('')}</div>
      </div>
    ` : ''}
    ${u.certifications?.length ? `
      <div style="margin-bottom:16px">
        <div style="font-size:11px;color:var(--text-3);margin-bottom:8px">Certifications</div>
        ${u.certifications.map(c=>`<div style="font-size:12px;padding:4px 0;color:var(--text-2)">🏆 ${c}</div>`).join('')}
      </div>
    ` : ''}
    ${u.linkedin ? `<div><a href="${u.linkedin}" target="_blank" style="font-size:12px;color:var(--accent)">🔗 LinkedIn Profile</a></div>` : ''}
  `;
  openModal();
}

// ─── Meeting Modal ────────────────────────────
function openMeetingModal() {
  const data = Store.get();
  document.getElementById('modal-title').textContent = 'Schedule Meeting';
  document.getElementById('modal-confirm').textContent = '✓ Schedule';
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <div class="form-row">
      <div class="form-field"><label>Meeting Title *</label><input id="mt-title" placeholder="e.g. Sprint Review"></div>
    </div>
    <div class="form-row cols-2">
      <div class="form-field"><label>Date *</label><input type="date" id="mt-date"></div>
      <div class="form-field"><label>Time *</label><input type="time" id="mt-time"></div>
    </div>
    <div class="form-row cols-2">
      <div class="form-field"><label>Duration (mins)</label><input type="number" id="mt-dur" value="60"></div>
      <div class="form-field"><label>Google Meet Link</label><input id="mt-link" placeholder="https://meet.google.com/..."></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label>Attendees</label>
        <select id="mt-attendees" multiple style="height:100px">
          ${data.users.filter(u=>u.id!==currentUser.id).map(u=>`<option value="${u.id}">${u.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-field"><label>Description</label><textarea id="mt-desc" rows="2"></textarea></div>
    </div>
  `;
  document.getElementById('modal-confirm').onclick = saveMeeting;
  openModal();
}

function saveMeeting() {
  const title = document.getElementById('mt-title').value.trim();
  const date = document.getElementById('mt-date').value;
  const time = document.getElementById('mt-time').value;
  if (!title||!date||!time) { H.notify('Fill required fields','error'); return; }
  const attendees = Array.from(document.getElementById('mt-attendees').selectedOptions).map(o=>o.value);
  Store.set(data => {
    data.meetings.push({
      id: H.uid(), title, date, time, organizer: currentUser.id,
      duration: parseInt(document.getElementById('mt-dur').value)||60,
      attendees, gmeetLink: document.getElementById('mt-link').value||'#',
      description: document.getElementById('mt-desc').value
    });
    return data;
  });
  closeModal();
  H.notify('Meeting scheduled!', 'success');
  renderCalendar();
}

// ─── Upload Modal ─────────────────────────────
function openFolderModal() {
  document.getElementById('modal-title').textContent = 'New Folder';
  document.getElementById('modal-confirm').textContent = '+ Create';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-row">
      <div class="form-field"><label>Folder Name *</label><input id="fn-name" placeholder="e.g. Marketing Assets"></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label>Access</label>
        <select id="fn-access"><option value="all">Everyone</option><option value="restricted">Restricted (You only)</option></select>
      </div>
    </div>
  `;
  document.getElementById('modal-confirm').onclick = () => {
    const name = document.getElementById('fn-name').value.trim();
    if (!name) { H.notify('Enter folder name','error'); return; }
    Store.set(data => {
      data.folders.push({ id:H.uid(), name, parentId:null, createdBy:currentUser.id,
        permissions:[document.getElementById('fn-access').value==='all'?'all':currentUser.id] });
      return data;
    });
    closeModal(); H.notify('Folder created!','success'); renderFiles();
  };
  openModal();
}

// ─── Tabs ─────────────────────────────────────
function switchTab(btn, paneId) {
  const parent = btn.closest('.tabs');
  parent.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const container = parent.nextElementSibling;
  const parentContainer = btn.closest('.page-body') || btn.parentElement.parentElement;
  parentContainer.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
  const pane = document.getElementById(paneId);
  if (pane) pane.classList.add('active');
}

// ─── Header dropdown ──────────────────────────
function toggleUserMenu() {
  document.getElementById('user-menu').classList.toggle('open');
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.header-user')) {
    document.getElementById('user-menu')?.classList.remove('open');
  }
});
