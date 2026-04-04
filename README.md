# ⬡ Nexus — Enterprise Project Management Platform

A full-featured, SAP SuccessFactors-inspired project management web application built with vanilla HTML, CSS, and JavaScript. Deployable on GitHub Pages with **zero backend required** (all data stored in `localStorage`).

---

## 🚀 Features

| Module | Features |
|--------|----------|
| **Auth & SSO** | Username/password login, session management, role-based access |
| **Organization** | Org chart hierarchy, employee directory, division/department structure |
| **Projects** | Project creation, team assignment, progress tracking, milestone management |
| **Tasks** | Kanban board, priority levels, deadlines, reporting workflow |
| **Calendar** | Task deadlines view, Google Meet meeting scheduling |
| **File Storage** | Folder/file management, permission-based access |
| **Chat** | Private 1:1 messaging, public announcements channel |
| **User Management** | Create/edit users, role assignment, activate/deactivate (Super Admin only) |

---

## 👥 Demo Accounts

| Username | Password | Role |
|----------|----------|------|
| `admin.root` | `Admin@123` | Super Admin |
| `admin.ops` | `Admin@456` | Super Admin |
| `admin.tech` | `Admin@789` | Super Admin |
| `james.wilson` | `Pass@123` | Manager |
| `sofia.martinez` | `Pass@456` | Manager |
| `kai.johnson` | `Pass@111` | Employee |
| `luna.patel` | `Pass@222` | Employee |
| `noah.kim` | `Pass@333` | Employee |

---

## 🔐 Role Permissions

| Permission | Employee | Manager | Super Admin |
|-----------|----------|---------|-------------|
| View Dashboard | ✅ | ✅ | ✅ |
| View Organization | ✅ | ✅ | ✅ |
| Edit Org Structure | ❌ | ✅ | ✅ |
| Create Tasks | ❌ | ✅ | ✅ |
| Create Projects | ❌ | ✅ | ✅ |
| Manage Files | ❌ | ✅ | ✅ |
| Public Chat Post | ❌ | ✅ | ✅ |
| User Management | ❌ | ❌ | ✅ |

---

## 📁 Project Structure

```
nexus/
├── index.html          # Login page
├── app.html            # Main application shell
├── css/
│   └── main.css        # Complete design system
└── js/
    ├── store.js        # Data store, Auth engine, Helpers
    └── app.js          # All page renderers & controllers
```

---

## 🌐 Deploy to GitHub Pages

1. **Fork or create a new repository** on GitHub
2. Upload all files maintaining the folder structure
3. Go to **Settings → Pages**
4. Set Source to **Deploy from a branch → main → / (root)**
5. Visit `https://yourusername.github.io/nexus/`

---

## 💾 Data Storage

All data is stored in **browser `localStorage`** — no server needed. Data persists across page refreshes within the same browser. Each user's session is managed via `sessionStorage`.

> **Note:** Data is per-browser. For a shared production environment, replace the `Store` module with a real backend API (Firebase, Supabase, etc.)

---

## 🎨 Design

- **Font**: Syne (headings) + DM Sans (body) + JetBrains Mono (code/data)
- **Theme**: Corporate-noir dark — deep charcoal surfaces with blue/purple accent gradients
- **Icons**: Unicode geometric symbols (no external icon library needed)

---

*Built with ❤️ — Pure HTML, CSS, JS. No frameworks, no build tools, no dependencies.*
