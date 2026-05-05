# Work Nucleus — Design System Implementation Guide
# For Claude Code

This document tells Claude Code exactly how to implement the Work Nucleus design system
in the Next.js 14 + Tailwind CSS + shadcn/ui frontend.

---

## 1. SETUP

### Import the token CSS
In `src/app/globals.css`, the `@theme` block defines all CSS custom properties.
The `tokens.css` file in this design system is the canonical reference for all values.

```css
/* globals.css already has these — verify they match tokens.css */
@theme {
  --color-primary: hsl(239 84% 67%);       /* #4f46e5 */
  --color-secondary: hsl(187 92% 69%);      /* #06b6d4 */
  --color-accent: hsl(38 92% 50%);          /* #f59e0b */
  --color-background: hsl(220 20% 97%);
  --color-foreground: hsl(222 47% 11%);
  --color-border: hsl(220 13% 91%);
  --radius: 0.75rem;
  /* ... see tokens.css for full list */
}
```

### Font
```tsx
// app/layout.tsx
import { Inter } from 'next/font/google';
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});
// Add to <html className={inter.variable}>
```

---

## 2. COLOR USAGE

| Situation | Tailwind class | CSS var |
|-----------|---------------|---------|
| Primary action | `bg-indigo-600` | `var(--color-primary)` |
| Primary hover | `hover:bg-indigo-700` | `var(--color-primary-hover)` |
| Primary subtle bg | `bg-indigo-50` | `var(--color-primary-subtle)` |
| Secondary accent | `text-cyan-500` | `var(--color-secondary)` |
| Accent / star | `text-amber-500` | `var(--color-accent)` |
| Page background | `bg-background` | `var(--color-background)` |
| Card surface | `bg-white` | `var(--color-surface)` |
| Body text | `text-slate-900` | `var(--color-foreground)` |
| Secondary text | `text-slate-600` | `var(--color-foreground-secondary)` |
| Muted text | `text-slate-500` | `var(--color-foreground-muted)` |
| Borders | `border-slate-200` | `var(--color-border)` |
| Focus ring | `ring-indigo-500/20` | `var(--color-ring)` |

### Gradient text
```tsx
<span className="bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">
  Work Nucleus
</span>
```

### Brand gradient (progress, logos, AI elements)
```css
background: linear-gradient(135deg, #6366f1 0%, #06b6d4 100%);
```

---

## 3. TYPOGRAPHY

**Font:** Inter only. Never override with another typeface.

```tsx
// Use these Tailwind classes exactly:

// Hero headline
className="text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900"

// Section heading
className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900"

// Card title
className="text-base font-semibold text-slate-900"

// Section eyebrow
className="text-xs font-bold uppercase tracking-widest text-indigo-600"

// Body large
className="text-lg text-slate-600 leading-relaxed"

// Body default
className="text-sm text-slate-600 leading-relaxed"

// Label
className="text-sm font-medium text-slate-700"

// Caption / meta
className="text-xs text-slate-400"

// Table header
className="text-[10px] font-bold uppercase tracking-wider text-slate-400"
```

**Font feature settings (apply to body):**
```css
font-feature-settings: "cv02","cv03","cv04","cv11";
```

---

## 4. COMPONENTS

### Button (`src/components/ui/button.tsx`)
Already implemented with CVA. Use these variants:

```tsx
<Button variant="default">Primary</Button>           // indigo-600, shadow-primary
<Button variant="outline">Outline</Button>            // white, border-slate-200
<Button variant="secondary">Secondary</Button>        // slate-100
<Button variant="ghost">Ghost</Button>                // transparent
<Button variant="destructive">Delete</Button>         // red-600
<Button size="sm">Small</Button>                      // h-8, px-3
<Button size="lg">Large</Button>                      // h-11, px-6
<Button size="icon">⟨icon⟩</Button>                  // h-9 w-9

// AI action button (not in CVA — apply inline):
className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_4px_14px_rgba(124,58,237,0.25)]"
```

### Badge (`src/components/ui/badge.tsx`)
```tsx
<Badge variant="default">Default</Badge>              // indigo-50/700
<Badge variant="secondary">Secondary</Badge>          // slate-100/700
<Badge variant="success">Active</Badge>               // emerald-50/800
<Badge variant="warning">Draft</Badge>                // amber-50/700
<Badge variant="destructive">Error</Badge>            // red-50/700
<Badge variant="outline">Outline</Badge>              // border-slate-200
```

**Skill category badges** (not in CVA — use className):
```tsx
// TECHNICAL
className="bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 text-xs font-medium"
// LEADERSHIP
className="bg-purple-50 text-purple-700 border border-purple-200 ..."
// BEHAVIOURAL
className="bg-emerald-50 text-emerald-700 border border-emerald-200 ..."
// COMMUNICATION
className="bg-yellow-50 text-yellow-700 border border-yellow-200 ..."
// DOMAIN
className="bg-cyan-50 text-cyan-700 border border-cyan-200 ..."
```

**Status badges for hiring plans:**
```tsx
const statusClasses = {
  DRAFT:     "bg-slate-100 text-slate-700 border-slate-200",
  ACTIVE:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};
```

### Card (`src/components/ui/card.tsx`)
```tsx
// Default
<Card>                                  // rounded-xl border border-slate-200/60 bg-white shadow-sm
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Subtitle</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// With colored top accent (KPI cards):
<Card className="overflow-hidden">
  <div className="h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-600" />
  <CardContent>...</CardContent>
</Card>

// Hover effect (add to any card):
className="card-hover"  // translateY(-1px) + elevated shadow on hover

// Dark card (AI agents, footer):
className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6"
```

### Input (`src/components/ui/input.tsx`)
```tsx
<Input placeholder="Search..." />
// h-10 rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20

// Error state:
className="border-red-500 focus:border-red-500 focus:ring-red-500/20"

// With icon prefix:
<div className="relative">
  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
  <Input className="pl-9" placeholder="Search..." />
</div>
```

### Tabs (`src/components/ui/tabs.tsx`)
```tsx
<Tabs defaultValue="overview">
  <TabsList>                            // bg-slate-100/80 rounded-xl p-1
    <TabsTrigger value="overview">Overview</TabsTrigger>    // active: bg-white shadow-sm
    <TabsTrigger value="jd">Job Description</TabsTrigger>
    <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">...</TabsContent>
</Tabs>
```

### Progress (`src/components/ui/progress.tsx`)
```tsx
<Progress value={60} max={100} />
// Track: bg-slate-100 rounded-full h-2
// Fill:  bg-gradient-to-r from-indigo-500 to-indigo-600
```

### Avatar
```tsx
<Avatar className="h-8 w-8">
  <AvatarImage src={user.picture} />
  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-cyan-500 text-white text-xs font-bold">
    {initials}
  </AvatarFallback>
</Avatar>
```

---

## 5. LAYOUT

### App Shell (`src/app/(protected)/layout.tsx`)
```tsx
<div className="flex h-screen">
  <Sidebar userRole={role} />                    // w-64 fixed
  <div className="flex flex-1 flex-col overflow-hidden">
    <TopBar />                                   // h-16 flex items-center
    <main className="flex-1 overflow-y-auto bg-background p-6">
      {children}
    </main>
  </div>
</div>
```

### Sidebar (`src/components/sidebar.tsx`)
- Logo: `h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700`
- Nav items active: `bg-indigo-50 text-indigo-700`
- Nav items default: `text-slate-500 hover:bg-slate-50 hover:text-slate-900`
- Nav item radius: `rounded-xl`
- Icons: Lucide React, `h-[18px] w-[18px]`

### Page header pattern
```tsx
<div className="mb-6 flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold text-slate-900">Page Title</h1>
    <p className="mt-0.5 text-sm text-slate-500">Subtitle</p>
  </div>
  <Button>Primary Action</Button>
</div>
```

### KPI card grid
```tsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  {kpis.map(kpi => (
    <Card key={kpi.title} className="overflow-hidden card-hover">
      <div className={cn("h-0.5 bg-gradient-to-r", kpi.gradient)} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{kpi.title}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{kpi.value}</p>
          </div>
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", kpi.iconBg)}>
            <kpi.Icon className={cn("h-5 w-5", kpi.iconColor)} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1 text-xs">
          <ArrowUpRight className="h-3 w-3 text-emerald-500" />
          <span className="text-emerald-600">{kpi.trend}</span>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

### Data table pattern
```tsx
<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
  <table className="w-full text-sm">
    <thead className="border-b border-slate-200 bg-slate-50">
      <tr>
        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Column
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-50">
      <tr className="hover:bg-slate-50 cursor-pointer transition-colors">
        <td className="px-4 py-3 text-slate-700">Content</td>
      </tr>
    </tbody>
  </table>
  {/* Pagination */}
  <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
    <span className="text-sm text-slate-500">Showing 1-20 of {total}</span>
    <div className="flex gap-2">
      <Button variant="outline" size="sm">Previous</Button>
      <Button variant="outline" size="sm">Next</Button>
    </div>
  </div>
</div>
```

---

## 6. KANBAN BOARD

### Column structure
```tsx
// Each column: ~280px wide, horizontal scroll container
<div className="flex gap-3 overflow-x-auto p-6">
  {stages.map(stage => (
    <div key={stage.id} className="w-[268px] flex-shrink-0 rounded-xl border border-slate-200 bg-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-xl border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
            <StageIcon className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <span className="text-sm font-semibold text-slate-800">{stage.name}</span>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
          {stage.candidateCount}
        </span>
      </div>
      {/* SLA meta row */}
      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-white px-4 py-1.5">
        <span className={cn("text-[10px]", slaColor)}>Avg {stage.avgDaysInStage}d · SLA {stage.maxDurationDays}d</span>
      </div>
      {/* Cards */}
      <div className="flex flex-col gap-2 p-2">
        {stage.candidates.map(c => <CandidateCard key={c.applicationId} candidate={c} />)}
      </div>
    </div>
  ))}
</div>
```

### Candidate card
```tsx
// SLA badge colors
const slaClass = (days, sla) => {
  const pct = days / sla;
  if (pct < 0.5) return "bg-emerald-50 text-emerald-700";
  if (pct < 1.0) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
};

// Score badge colors
const scoreClass = (score) => {
  if (!score) return null;
  if (score >= 75) return "bg-emerald-50 text-emerald-700";
  if (score >= 50) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
};
```

---

## 7. AI SURFACES

### AI icon / header
```tsx
<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600">
  <Sparkles className="h-3.5 w-3.5 text-white" />
</div>
```

### AI action button
```tsx
<Button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_4px_14px_rgba(124,58,237,0.25)] hover:brightness-110">
  <Sparkles className="h-4 w-4" />
  Generate with AI
</Button>
```

### AI insight card
```tsx
const severityConfig = {
  info:     { bg: "bg-blue-50/50",  border: "border-blue-200",  iconBg: "bg-blue-100",  icon: Info,          color: "text-blue-600",  recLabel: "text-blue-700" },
  warning:  { bg: "bg-amber-50/50", border: "border-amber-200", iconBg: "bg-amber-100", icon: AlertTriangle,  color: "text-amber-600", recLabel: "text-amber-900" },
  critical: { bg: "bg-red-50/50",   border: "border-red-200",   iconBg: "bg-red-100",   icon: AlertCircle,   color: "text-red-600",   recLabel: "text-red-700" },
};
```

### Loading state
```tsx
// Shimmer skeleton
<div className="shimmer h-4 rounded-md w-3/4" />  // uses .shimmer class from globals.css

// Spinner
<div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />

// AI generating state
<div className="flex flex-col items-center gap-3 py-8">
  <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
  <p className="text-sm text-slate-500">AI is crafting your job description…</p>
</div>
```

---

## 8. ICONOGRAPHY

**Package:** `lucide-react` only. Never import from any other icon library.

```tsx
import {
  LayoutDashboard, ClipboardList, Users, FileText,
  ShieldCheck, Award, IndianRupee, BarChart3, GraduationCap, Shield,
  Sparkles, ArrowRight, Check, ChevronDown, MoreHorizontal,
  Plus, Search, Download, RefreshCw, Bell, LogOut,
  Briefcase, Building2, Clock, Mail, Phone, MapPin,
  Kanban, MessageSquare, Target, TrendingUp,
  Info, AlertTriangle, AlertCircle, CalendarClock,
  Play, CheckCircle2, XCircle, RotateCcw, Pencil, Eye, Copy, Trash2,
} from 'lucide-react';
```

**Sizes:**
- In-button: `h-4 w-4` (16px)
- Navigation: `h-[18px] w-[18px]` (18px)
- Feature / card: `h-5 w-5` (20px)
- Hero / empty state: `h-6 w-6` or `h-7 w-7` (24–28px)
- Never use emoji as icons in product UI

---

## 9. ANIMATIONS (Framer Motion)

```tsx
// Fade up on scroll
<motion.div
  initial={{ opacity: 0, y: 24 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}           // ← ALWAYS include this
  transition={{ duration: 0.4, delay: index * 0.1 }}
>

// Stagger container
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
```

---

## 10. CHART TOKENS (Recharts)

```tsx
const CHART = {
  primary:   "#6366f1",
  secondary: "#06b6d4",
  success:   "#10b981",
  warning:   "#f59e0b",
  danger:    "#ef4444",
  purple:    "#8b5cf6",
};

// Tooltip
const Tooltip = ({ active, payload, label }) => active && payload?.length ? (
  <div className="rounded-lg border border-slate-100 bg-white px-3 py-2 shadow-lg">
    <p className="text-xs font-medium text-slate-500">{label}</p>
    {payload.map((e, i) => (
      <p key={i} className="text-sm font-semibold" style={{ color: e.color }}>
        {e.name}: {e.value}
      </p>
    ))}
  </div>
) : null;

// Grid / Axis
<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
<XAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
<YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />

// Area gradient
<defs>
  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
  </linearGradient>
</defs>

// Bar radius
<Bar radius={[4, 4, 0, 0]} />
```

---

## 11. DO's and DON'Ts

### DO
- Use `indigo-600` (`#4f46e5`) as the primary action color everywhere
- Use `rounded-xl` for cards, `rounded-lg` for buttons/inputs, `rounded-full` for badges/avatars
- Use the brand gradient `from-indigo-500 to-cyan-500` for progress bars, logos, AI elements
- Always include `viewport={{ once: true }}` on Framer Motion animations
- Use shimmer skeletons for loading states, not spinners for content areas
- Use `text-slate-900` for headings, `text-slate-600` for body, `text-slate-400` for captions

### DON'T
- Use raw `#000` or `#fff` — always use slate scale or explicit white
- Mix border-radius patterns in the same context
- Import from any icon library except `lucide-react`
- Override the Inter font
- Use emoji as icons in product UI
- Create custom colors outside the defined palette
- Use `viewport={{ once: false }}` on scroll animations (causes re-triggering)
