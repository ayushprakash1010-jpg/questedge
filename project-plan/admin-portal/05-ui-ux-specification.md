# 05 — UI/UX Specification

**Project:** Work Nucleus / QuestEdge Admin Portal  
**Version:** 1.0 — Phase 0 Planning

---

## 1. Design System Reference

Follow `design-system-v2/CLAUDE.md` exactly:

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `indigo-600 (#4f46e5)` | Buttons, active nav, badges |
| Secondary | `cyan-500` | Accents, secondary badges |
| Accent | `amber-500` | Warnings, attention states |
| Background | `hsl(220 20% 97%)` | Page background |
| Surface | `white` | Card backgrounds |
| Border | `slate-200` | Card borders, table dividers |
| Foreground | `slate-900` | Body text |
| Muted | `slate-500` | Secondary text, placeholders |
| Danger | `red-600` | Destructive actions, critical badges |
| Success | `green-600` | Active/verified states |

**Font:** Inter only. Loaded via `next/font/google`.  
**Icons:** `lucide-react` only. Sizes: 16px inline, 18px sidebar nav, 20px feature icons.  
**Border radius:** `rounded-xl` cards, `rounded-lg` buttons/inputs, `rounded-full` badges/avatars.

---

## 2. Admin Portal Design Principles

The admin portal is an **operational tool**, not a marketing page. Design priorities:

1. **Density over decoration** — more data per screen, less whitespace than the customer app
2. **Clarity over animation** — minimal Framer Motion; use only for loading skeletons and micro-feedback
3. **Consistent status indicators** — every entity has a predictable badge color for its status
4. **Confirm before destruct** — every irreversible action requires a confirmation dialog with a reason
5. **Contextual actions** — actions appear on the detail page, not on the list row (except quick-view)

---

## 3. Layout

### Shell Layout (identical to existing support-admin)

```
┌──────────────────────────────────────────────────────────┐
│ TopBar: Logo │ Breadcrumbs             │ User menu        │
├──────┬───────────────────────────────────────────────────┤
│      │                                                    │
│ 240px│         Main Content Area                         │
│ Side │         (scrollable, p-6 padding)                  │
│ bar  │                                                    │
│      │                                                    │
└──────┴────────────────────────────────────────────────────┘
```

### Page Layout Pattern

```tsx
<div className="space-y-6">
  <PageHeader title="..." subtitle="..." actions={[...]} />
  
  {/* Filters row */}
  <div className="flex gap-3 flex-wrap">
    <Input placeholder="Search..." />
    <Select options={...} />
    <Select options={...} />
  </div>
  
  {/* Data table or card grid */}
  <Card>
    <DataTable columns={...} data={...} />
    <DataTablePagination meta={meta} onPageChange={...} />
  </Card>
</div>
```

---

## 4. Component Specifications

### 4.1 Platform KPI Card

```tsx
// Used on the dashboard
<PlatformKpiCard
  label="Total Organizations"
  value={47}
  trend={+3}           // optional: show "↑ 3 this week" 
  trendLabel="this week"
  icon={Building2}
  iconColor="text-blue-600"
  href="/organizations"  // makes card clickable
/>
```

Visual: white card, 6px rounded-xl, metric in `text-2xl font-bold`, trend in `text-xs text-green-600`, icon 24px.

### 4.2 Data Table

Extend the existing `DataTable` pattern from the main frontend.

Columns definition:
```tsx
const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role', render: (v) => <StatusBadge type="role" value={v} /> },
  { key: 'isActive', label: 'Status', render: (v) => <StatusBadge type="active" value={v} /> },
  { key: 'actions', label: '', render: (_, row) => <AdminActionMenu row={row} /> },
]
```

Table rows should have:
- `hover:bg-slate-50` on row hover
- Clickable rows navigate to detail (except action column)
- No row-level destructive actions — only on detail page

### 4.3 StatusBadge

```tsx
<StatusBadge type="mandate_status" value="ACTIVE" />
// → <Badge className="bg-green-50 text-green-700 border-green-200">Active</Badge>

<StatusBadge type="reward_status" value="PAID" />
// → <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">Paid</Badge>
```

Standard color mappings:
| Status | Badge style |
|--------|-------------|
| ACTIVE / VERIFIED / ACTIVE | green |
| DRAFT / PENDING / POTENTIAL | amber |
| PAUSED / ON_HOLD | orange |
| CLOSED / INACTIVE / EXPIRED | slate |
| REJECTED / FAILED / DISPUTED | red |
| PAID / APPROVED / HIRED | indigo |

### 4.4 ConfirmDialog (New Component)

Required for all destructive or sensitive actions:

```tsx
<ConfirmDialog
  title="Deactivate User Account"
  description="This will prevent Raj Mehta from accessing the platform immediately."
  consequences={[
    "Prevent all logins immediately",
    "Block the Auth0 account",
    "Write an audit log entry"
  ]}
  requireReason={true}
  reasonLabel="Reason for deactivation"
  confirmLabel="Deactivate Account"
  confirmVariant="destructive"  // red button
  onConfirm={(reason) => handleDeactivate(reason)}
  onCancel={() => setOpen(false)}
/>
```

### 4.5 Sidebar (Extended)

New nav sections to add to `SupportSidebar`:

```tsx
const navGroups = [
  {
    label: null, // top-level
    items: [{ href: '/', label: 'Overview', icon: LayoutDashboard }],
  },
  {
    label: 'Organization',
    items: [
      { href: '/organizations', label: 'Organizations', icon: Building2 },
      { href: '/users', label: 'Users', icon: Users, new: true },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/tickets', label: 'Tickets', icon: Ticket, badge: openTicketCount },
      { href: '/marketplace', label: 'Marketplace', icon: Store, new: true },
    ],
  },
  {
    label: 'Platform',
    items: [
      { href: '/ai-operations', label: 'AI Operations', icon: Bot, new: true, adminOnly: true },
      { href: '/metrics', label: 'Metrics', icon: TrendingUp },
      { href: '/security', label: 'Security', icon: Shield, new: true, adminOnly: true },
      { href: '/tools', label: 'Tools', icon: Wrench },
      { href: '/system-health', label: 'System Health', icon: HeartPulse, new: true },
    ],
  },
];
```

Items with `adminOnly: true` are hidden for `SUPPORT_REP` role.

---

## 5. Page-Level Specifications

### 5.1 Dashboard (`/`)

Extend existing page with:
- Row 1: 5 KPI cards (Total Orgs, Active Users, Active Mandates, Verified Recruiters, Open Tickets)
- Row 2: 3 KPI cards (AI Cost 7d, Failed AI Calls, Orgs Needing Attention)
- Section: "Recently Added Organizations" (existing)
- Section: "Open Critical/High Tickets" (existing)
- NEW section: "Recent Admin Actions" (last 5 AuditLog entries from support users) — SUPPORT_ADMIN only

### 5.2 Users Directory (`/users`)

- Search input: email or name (debounced 300ms)
- Filters: Role (multi-select), UserType, Status (Active/Inactive), Org
- Table columns: Name, Email, Org, Role, UserType, Status (badge), Last Updated, Actions
- Click row → `/users/[userId]`
- No inline actions on row

### 5.3 User Detail (`/users/[userId]`)

Tabs: Profile | Activity | Actions

**Profile tab:**
- Avatar, name, email, org name (clickable), role badge, userType badge, isActive status
- Auth0 sub (truncated, copy button)
- Created at, updated at

**Activity tab:**
- Last 20 AuditLog entries where `userId = this user` (from `GET /api/v1/support/audit-log?userId=...`)

**Actions tab (SUPPORT_ADMIN only):**
- "Deactivate Account" button (red) — shows ConfirmDialog
- "Reactivate Account" button (green, if currently inactive) — shows ConfirmDialog

### 5.4 Marketplace — Recruiters (`/marketplace/recruiters`)

- Search: name or email
- Filters: Verified (all/verified/unverified), Active (all/active/inactive)
- Table: Name, Email, Experience, Specializations, Referral Count, Rewards Count, Verified, Active, Actions
- Detail page: full profile + reward history + referral history + verify/deactivate buttons

### 5.5 AI Operations (`/ai-operations`) — SUPPORT_ADMIN only

- 4 KPI cards: Total Calls (7d), Total Tokens (7d), Estimated Cost (7d), Error Rate (7d)
- Bar chart: Cost by agent name (Recharts BarChart)
- Table: Cost by org (org name, call count, total tokens, total cost)
- Link to `/ai-operations/logs` for full call log

### 5.6 Security — Audit Log (`/security/audit-log`) — SUPPORT_ADMIN only

- Filters: Org (dropdown), Action (text filter), Entity Type, Date range
- Table: Timestamp, Actor, Action, Entity Type, Entity ID, Org, IP Address
- Click row → expand inline to show `changes` JSON
- No delete capability — audit log is immutable

### 5.7 Security — Chain Verification (`/security/security-log`) — SUPPORT_ADMIN only

- Info box explaining hash-chained log
- "Verify Chain Integrity" button → calls backend → shows result:
  - ✅ "Chain intact — 1,234 records verified"
  - ❌ "Chain broken at record #456 — investigate immediately"
- Table: last 50 SecurityLog entries (org, eventType, userId, timestamp)
- Org filter for cross-org view

---

## 6. Responsive Behavior

The admin portal is a desktop-first tool. Target minimum: 1280px wide.

- Sidebar: fixed 240px at ≥1024px; hidden (hamburger) at <1024px
- Tables: horizontal scroll on <1024px
- KPI cards: 5-col grid → 3-col → 2-col → 1-col on mobile

---

## 7. Loading, Empty, and Error States

| State | Implementation |
|-------|---------------|
| Loading | Skeleton cards/rows (using `<Skeleton />` component) |
| Empty | `<EmptyState icon={...} title="No results" description="..." />` |
| Error | `<Alert variant="destructive">Failed to load data. Please try again.</Alert>` with retry button |
| Permission denied | `<EmptyState icon={Lock} title="Access Restricted" description="You need SUPPORT_ADMIN role." />` |
| Not found | Next.js `not-found.tsx` pattern |

---

## 8. Accessibility Requirements

- All interactive elements have unique `id` and `aria-label`
- Tables have `<th scope="col">` headers
- Modals trap focus (`aria-modal="true"`, focus restored on close)
- Color is never the only indicator (status badges have text)
- Keyboard: `Tab` navigates sidebar, `Enter/Space` activates items
- Screen reader: loading states use `aria-live="polite"`
