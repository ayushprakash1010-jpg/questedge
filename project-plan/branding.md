# Work Nucleus — Branding & Design System

> This document is the single source of truth for all visual design decisions across Work Nucleus. Every UI component, page, and feature must follow these guidelines to maintain brand consistency.

---

## 1. Brand Identity

| Attribute       | Value                                                        |
| --------------- | ------------------------------------------------------------ |
| **Name**        | Work Nucleus                                                 |
| **Tagline**     | AI-powered hiring intelligence                               |
| **Voice**       | Professional, confident, approachable, modern                |
| **Personality** | Smart but not cold. Enterprise-grade but not intimidating.   |
| **AI Branding** | "Powered by Claude AI" — always reference the AI engine      |

### Logo

- **Mark**: Rounded square (`rounded-lg`) with gradient background `from-indigo-600 to-cyan-500`, white bold "W" inside
- **Wordmark**: "Work" in `text-slate-900` + "Nucleus" in `text-indigo-600`, `font-bold`
- **Minimum size**: 32x32px for the mark, 16px font for the wordmark
- **Usage**: Mark + Wordmark together in headers/navigation; Mark alone for favicons and compact spaces

---

## 2. Color Palette

### Option A — Deep Indigo + Electric Cyan (Active)

#### Primary Colors

| Token                 | Hex       | HSL                | Usage                                           |
| --------------------- | --------- | ------------------ | ----------------------------------------------- |
| `indigo-600` (Primary)| `#4F46E5` | `239 84% 67%`     | Buttons, links, active states, primary actions   |
| `indigo-700`          | `#4338CA` | —                  | Button hover, dark accents                       |
| `indigo-500`          | `#6366F1` | —                  | Gradient starts, lighter primary accents         |
| `indigo-900`          | `#312E81` | —                  | Dark mode text emphasis                          |
| `indigo-50`           | `#EEF2FF` | —                  | Badges, light backgrounds, hover fills           |
| `indigo-100`          | `#E0E7FF` | —                  | Subtle borders, muted backgrounds                |

#### Secondary Colors

| Token                  | Hex       | Usage                                           |
| ---------------------- | --------- | ----------------------------------------------- |
| `cyan-500` (Secondary) | `#06B6D4` | Gradient endpoints, secondary accents            |
| `cyan-400`             | `#22D3EE` | Footer hover links, gradient elements            |
| `cyan-50`              | `#ECFEFF` | Light secondary backgrounds                      |

#### Accent Colors

| Token                 | Hex       | Usage                                            |
| --------------------- | --------- | ------------------------------------------------ |
| `amber-500` (Accent)  | `#F59E0B` | Highlights, stars, attention-grabbing elements    |
| `amber-400`           | `#FBBF24` | Star ratings, warm accents                        |

#### Neutrals (Slate Scale)

| Token        | Hex       | Usage                                               |
| ------------ | --------- | --------------------------------------------------- |
| `slate-50`   | `#F8FAFC` | Page backgrounds, subtle fills                       |
| `slate-100`  | `#F1F5F9` | Card backgrounds, muted sections                     |
| `slate-200`  | `#E2E8F0` | Borders, dividers                                    |
| `slate-300`  | `#CBD5E1` | Input borders, secondary borders                     |
| `slate-400`  | `#94A3B8` | Placeholder text, disabled icons                     |
| `slate-500`  | `#64748B` | Secondary text, labels                               |
| `slate-600`  | `#475569` | Body text, descriptions                              |
| `slate-700`  | `#334155` | Strong body text, nav items                          |
| `slate-800`  | `#1E293B` | Dark backgrounds (cards in dark sections)            |
| `slate-900`  | `#0F172A` | Headings, dark sections (footer, AI agents)          |
| `slate-950`  | `#020617` | Deepest dark backgrounds                             |

#### Semantic Colors

| Token           | Hex/HSL             | Usage                              |
| --------------- | ------------------- | ---------------------------------- |
| `destructive`   | `hsl(0 84% 60%)`   | Error states, delete actions       |
| `green-100`     | —                   | Success backgrounds                |
| `green-600`     | —                   | Success icons, confirmation        |

#### CSS Theme Variables (globals.css)

```css
--color-primary: hsl(239 84% 67%);          /* indigo-600 */
--color-primary-foreground: hsl(0 0% 100%);  /* white */
--color-secondary: hsl(187 92% 69%);         /* cyan-500 */
--color-secondary-foreground: hsl(222 47% 11%);
--color-accent: hsl(38 92% 50%);             /* amber-500 */
--color-accent-foreground: hsl(0 0% 100%);
--color-background: hsl(210 40% 98%);        /* slate-50 */
--color-foreground: hsl(222 47% 11%);        /* slate-900 */
--color-muted: hsl(210 40% 96%);
--color-muted-foreground: hsl(215 16% 47%);
--color-border: hsl(214 32% 91%);
--color-ring: hsl(239 84% 67%);              /* matches primary */
--radius: 0.5rem;
```

---

## 3. Typography

### Font Family

| Usage      | Font         | Fallback                                        |
| ---------- | ------------ | ----------------------------------------------- |
| **All UI** | `Inter`      | `system-ui, -apple-system, sans-serif`          |

### Type Scale

| Element                 | Classes                                                      |
| ----------------------- | ------------------------------------------------------------ |
| **Hero headline**       | `text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight` |
| **Section heading (h2)**| `text-3xl sm:text-4xl font-bold tracking-tight`              |
| **Card title (h3)**     | `text-lg font-semibold`                                      |
| **Section eyebrow**     | `text-sm font-semibold uppercase tracking-wider text-indigo-600` |
| **Body large**          | `text-lg leading-relaxed text-slate-600`                     |
| **Body default**        | `text-sm leading-relaxed text-slate-600`                     |
| **Body strong**         | `text-sm font-semibold text-slate-900`                       |
| **Label**               | `text-sm font-medium text-slate-700`                         |
| **Caption / metadata**  | `text-xs text-slate-500`                                     |
| **Nav link**            | `text-sm font-medium text-slate-600`                         |
| **Button text**         | `text-sm font-semibold`                                      |

### Text Colors

| Context           | Color class          |
| ----------------- | -------------------- |
| Headings          | `text-slate-900`     |
| Body text         | `text-slate-600`     |
| Secondary text    | `text-slate-500`     |
| Links             | `text-indigo-600`    |
| Link hover        | `hover:text-indigo-600` |
| On dark bg        | `text-white` / `text-slate-300` / `text-slate-400` |
| Gradient text     | `bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent` |

---

## 4. Gradients

| Name              | Classes                                             | Usage                          |
| ----------------- | --------------------------------------------------- | ------------------------------ |
| **Brand gradient**| `bg-gradient-to-r from-indigo-600 to-cyan-500`      | Logo, badges, highlight text   |
| **Hero bg**       | `bg-gradient-to-br from-slate-50 via-indigo-50/40 to-cyan-50/30` | Hero section background |
| **CTA banner**    | `bg-gradient-to-r from-indigo-600 to-indigo-700`    | Full-width CTA sections        |
| **Feature icon (indigo)** | `bg-gradient-to-br from-indigo-500 to-indigo-600` | Feature card icons       |
| **Feature icon (cyan)**   | `bg-gradient-to-br from-cyan-500 to-cyan-600`     | Feature card icons       |
| **Feature icon (mixed)**  | `bg-gradient-to-br from-indigo-500 to-cyan-500`   | Feature card icons       |
| **Feature icon (amber)**  | `bg-gradient-to-br from-amber-500 to-amber-600`   | Feature card icons       |
| **Avatar**        | `bg-gradient-to-br from-indigo-500 to-cyan-500`     | User avatar initials           |
| **Popular badge** | `bg-gradient-to-r from-indigo-600 to-cyan-500`      | Pricing "Most Popular" badge   |

---

## 5. Spacing & Layout

### Container

```
max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
```

### Section Padding

```
py-24 sm:py-32           /* Landing page sections */
py-16                    /* Footer */
py-20                    /* CTA banner */
```

### Grid Patterns

| Layout          | Classes                                    |
| --------------- | ------------------------------------------ |
| 3-column        | `grid gap-8 md:grid-cols-3`                |
| 2-column        | `grid gap-16 lg:grid-cols-2`               |
| Feature grid    | `grid gap-6 md:grid-cols-2 lg:grid-cols-3` |
| Footer columns  | `grid gap-12 md:grid-cols-2 lg:grid-cols-5`|
| Stats row       | `grid grid-cols-3 gap-8`                   |

### Spacing Scale (commonly used)

| Gap/Margin | Usage                          |
| ---------- | ------------------------------ |
| `gap-2`    | Tight icon groups              |
| `gap-3`    | Nav items, list items          |
| `gap-4`    | Button groups, card internals  |
| `gap-6`    | Card grids, section elements   |
| `gap-8`    | Major grid gaps, section parts |
| `mt-3`     | After eyebrow → heading        |
| `mt-4`     | After heading → description    |
| `mt-6`     | After description → content    |
| `mt-8`     | After content → list/grid      |
| `mt-16`    | Section header → content grid  |

---

## 6. Components

### Buttons

| Variant     | Classes                                                                    |
| ----------- | -------------------------------------------------------------------------- |
| **Primary** | `bg-indigo-600 text-white rounded-xl px-6 py-3.5 text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 hover:shadow-xl` |
| **Secondary / Outline** | `border border-slate-300 bg-white text-slate-700 rounded-xl px-6 py-3.5 text-sm font-semibold hover:border-indigo-300 hover:bg-indigo-50` |
| **Ghost / Nav** | `text-sm font-medium text-slate-600 hover:text-indigo-600`            |
| **On dark** | `bg-white text-indigo-700 rounded-xl px-6 py-3.5 text-sm font-semibold hover:bg-indigo-50` |
| **On dark outline** | `border border-indigo-400 text-white rounded-xl px-6 py-3.5 text-sm font-semibold hover:bg-indigo-500` |

### Cards

| Type            | Classes                                                              |
| --------------- | -------------------------------------------------------------------- |
| **Default**     | `rounded-2xl border border-slate-200 bg-white p-8 shadow-sm`        |
| **Hover**       | `hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50`|
| **Highlighted** | `border-indigo-600 shadow-xl shadow-indigo-100/50 ring-1 ring-indigo-600` |
| **Dark**        | `rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6`        |
| **Form card**   | `rounded-2xl border border-slate-200 bg-slate-50 p-8`               |

### Badges

```
inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700
```

### Inputs

```
w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
```

### Icon Containers

| Size    | Classes                                                              |
| ------- | -------------------------------------------------------------------- |
| Small   | `flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50`|
| Medium  | `inline-flex rounded-xl bg-gradient-to-br p-3 shadow-sm`            |
| Large   | `flex h-14 w-14 items-center justify-center rounded-full`           |

### Section Eyebrow Pattern

```tsx
<span className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
  Section Label
</span>
<h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
  Section Heading
</h2>
<p className="mt-4 text-lg text-slate-600">
  Section description text.
</p>
```

---

## 7. Borders & Radii

| Element        | Radius       | Border                          |
| -------------- | ------------ | ------------------------------- |
| Buttons (sm)   | `rounded-lg` | —                               |
| Buttons (lg)   | `rounded-xl` | —                               |
| Cards          | `rounded-2xl`| `border border-slate-200`       |
| Inputs         | `rounded-lg` | `border border-slate-300`       |
| Badges         | `rounded-full`| `border border-indigo-200`     |
| Icons          | `rounded-lg` or `rounded-xl` | —                  |
| Avatars        | `rounded-full`| —                              |
| Logo mark      | `rounded-lg` | —                               |

**Base radius variable**: `--radius: 0.5rem` (8px)

---

## 8. Shadows

| Name               | Classes                                     | Usage                |
| ------------------ | ------------------------------------------- | -------------------- |
| **Subtle**         | `shadow-sm`                                 | Cards, buttons       |
| **Elevated**       | `shadow-lg shadow-indigo-100/50`            | Hovered cards        |
| **Button shadow**  | `shadow-lg shadow-indigo-500/25`            | Primary CTA buttons  |
| **Button hover**   | `shadow-xl shadow-indigo-500/30`            | Primary CTA hover    |
| **Highlighted card** | `shadow-xl shadow-indigo-100/50`          | Popular pricing      |
| **Blur orb**       | `blur-3xl` with `bg-indigo-400/20` or `bg-cyan-400/20` | Background decoration |

---

## 9. Effects & Interactions

### Glassmorphism (Header)

```
bg-white/80 backdrop-blur-lg border-b border-slate-200/60
```

### Background Patterns

- **Dot grid**: `radial-gradient(circle, #4f46e5 1px, transparent 1px)` at `32px 32px` with `opacity-[0.03]`
- **Blur orbs**: Absolutely positioned `rounded-full` divs with gradient colors and `blur-3xl`

### Hover States

| Element     | Hover Effect                                                   |
| ----------- | -------------------------------------------------------------- |
| Buttons     | `hover:bg-indigo-700`, color shift + shadow increase           |
| Cards       | `hover:border-indigo-200 hover:shadow-lg`                      |
| Links       | `hover:text-indigo-600` (light) / `hover:text-cyan-400` (dark)|
| Nav items   | `hover:text-indigo-600`                                        |
| Social icons| `hover:bg-indigo-600 hover:text-white`                         |

### Transitions

```
transition-all          /* Buttons, cards */
transition-colors       /* Links, text-only changes */
transition-transform    /* Icons, arrows */
```

---

## 10. Animation (Framer Motion)

### Fade Up (Default)

```ts
initial={{ opacity: 0, y: 24 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true }}
transition={{ duration: 0.4, delay: i * 0.1 }}
```

### Staggered Container

```ts
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
```

### Accordion Expand

```ts
initial={{ height: 0, opacity: 0 }}
animate={{ height: "auto", opacity: 1 }}
exit={{ height: 0, opacity: 0 }}
transition={{ duration: 0.2 }}
```

### Hero Entry

```ts
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.5, delay: 0.1 }}  /* stagger by +0.1 */
```

---

## 11. Dark Sections

Used for high-contrast areas (AI Agents showcase, Footer):

| Token            | Classes                                       |
| ---------------- | --------------------------------------------- |
| **Background**   | `bg-slate-900`                                |
| **Card**         | `bg-slate-800/50 border border-slate-700/50`  |
| **Heading**      | `text-white`                                  |
| **Body**         | `text-slate-300` or `text-slate-400`          |
| **Link hover**   | `hover:text-cyan-400`                         |
| **Social hover** | `bg-slate-800 hover:bg-indigo-600`            |
| **Decoration**   | `bg-indigo-500/10` blur orbs                  |

---

## 12. Iconography

| Library   | Package         | Usage                                       |
| --------- | --------------- | ------------------------------------------- |
| **Lucide**| `lucide-react`  | All UI icons — navigation, features, actions|

### Common Icons

| Icon             | Usage                        |
| ---------------- | ---------------------------- |
| `ArrowRight`     | CTA buttons, links           |
| `Check`          | Feature lists, checkmarks    |
| `ChevronDown`    | Accordions, dropdowns        |
| `Sparkles`       | AI badge, AI features        |
| `Menu` / `X`     | Mobile nav toggle            |
| `Mail`           | Email contact                |
| `Phone`          | Phone contact                |
| `MapPin`         | Office location              |
| `LayoutDashboard`| Dashboard nav                |
| `ClipboardList`  | Hiring plans                 |
| `Users`          | Candidates                   |
| `GraduationCap`  | Training                     |
| `Shield`         | Admin                        |
| `Kanban`         | Pipeline feature             |
| `BarChart3`      | Analytics                    |
| `FileText`       | JD generation                |
| `MessageSquare`  | Feedback                     |

### Icon Sizing

| Context          | Size          |
| ---------------- | ------------- |
| In-button arrow  | `h-4 w-4`    |
| Feature card     | `h-5 w-5`    |
| Navigation       | `h-4 w-4`    |
| Contact info     | `h-5 w-5`    |
| Mobile menu      | `h-6 w-6`    |
| Success check    | `h-7 w-7`    |

---

## 13. Responsive Breakpoints

Following Tailwind defaults:

| Breakpoint | Min-width | Usage                           |
| ---------- | --------- | ------------------------------- |
| `sm:`      | 640px     | Larger section padding, 2-col   |
| `md:`      | 768px     | Desktop nav visible, 2-3 cols   |
| `lg:`      | 1024px    | Full grid layouts, max padding  |

### Mobile-First Patterns

- Navigation: Hamburger below `md:`, full nav above
- Grids: Single column → `md:grid-cols-2` → `lg:grid-cols-3`
- Section padding: `py-24` → `sm:py-32`
- Hero text: `text-4xl` → `sm:text-5xl` → `lg:text-6xl`
- CTAs: Stack (`flex-col`) → inline (`sm:flex-row`)

---

## 14. Component Library

| Tool             | Package                    | Purpose                     |
| ---------------- | -------------------------- | --------------------------- |
| **shadcn/ui**    | Manual component files     | Base UI primitives          |
| **CVA**          | `class-variance-authority` | Component variant system    |
| **clsx + twMerge** | `@/lib/utils` → `cn()`  | Conditional class merging   |
| **Framer Motion**| `framer-motion`            | Scroll & entrance animations|
| **Lucide React** | `lucide-react`             | Iconography                 |

### shadcn/ui Components (Available)

`button`, `input`, `card`, `badge`, `avatar`

### shadcn/ui Components (To Add as Needed)

`table`, `dropdown-menu`, `dialog`, `toast`, `tabs`, `form`, `select`, `textarea`, `tooltip`, `popover`, `sheet`, `separator`

---

## 15. Quick Reference — Do's and Don'ts

### Do

- Use `indigo-600` as the primary action color everywhere
- Use the brand gradient (`indigo-600 → cyan-500`) for visual highlights
- Use `slate` scale for all neutral text and backgrounds
- Use `rounded-2xl` for cards, `rounded-xl` for buttons, `rounded-lg` for inputs
- Use `framer-motion` for scroll-triggered animations
- Keep section headings centered with the eyebrow → heading → description pattern
- Use `shadow-indigo-*` colored shadows for depth on primary elements

### Don't

- Use raw black (`#000`) or white (`#fff`) — always use slate scale or explicit `white`
- Mix border-radius styles within the same context
- Use animations without `viewport={{ once: true }}` (prevents re-triggering)
- Use colors outside this palette without documenting the addition here
- Use different icon libraries — stick to Lucide React
- Create custom fonts or override Inter
