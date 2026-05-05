# Work Nucleus — Frontend Redesign Plan (Design System v2)

> Source of truth for this redesign: `design-system-v2/` (`tokens.css`, `CLAUDE.md`, `preview/*.html`, `ui-kit/01-Dashboard.html`, `ui-kit/02-HiringPlans.html`, `ui-kit/03-Pipeline-Kanban.html`).
> Target codebase: `work-nucleus/frontend/` (Next.js 14 App Router + Tailwind v4 + local shadcn-style primitives, currently entangled with `@nova-design-system/*`).

---

## 1. Goals & Non-Goals

**Goals**
- Adopt the v2 token system as the **single source of truth** for color, spacing, radius, shadow, motion, sizing, and chart styling.
- Establish a first-party component library (Button / Card / Badge / Input / Tabs / Progress / Avatar / Toast / Dropdown / Empty / AI Insight / Skill Chip / KPI Card / Candidate Card) that mirrors the v2 mockups exactly.
- Refactor the App Shell (Sidebar + TopBar + Protected layout) to match `ui-kit/*.html` (240px sidebar, 64px topbar, 24px content padding).
- Refactor the three priority pages — Dashboard, Hiring Plans (list + detail), Pipeline Kanban — to the v2 mockup pixel-for-pixel.
- Cascade the new visual language across every other module (Candidates, Offers, BGV, Appraisal, Compensation, Training, Admin, public-facing pages).

**Non-Goals**
- No backend, schema, API contract, or domain-logic changes. Pages keep the same data, routes, and behavior.
- No new modules / features outside what already ships in Phases 1–5.
- No animation/library swap (keep Framer Motion + Recharts + lucide-react).

---

## 2. Current-State Findings (what the redesign has to clean up)

1. **Tokens are duplicated and incomplete in `src/app/globals.css`** — only a thin slice of v2 tokens is present, no semantic aliases, no gradients, no shadows, no animation/sizing tokens, no chart tokens.
2. **Nova design system is still wired in three places** but unused except in a couple of pages:
   - `src/app/globals.css` imports `@nova-design-system/nova-base/dist/css/spark.css` (and patches its broken `--leading-*` values).
   - `src/components/nova-provider.tsx` calls `defineCustomElements()` and wraps the protected layout.
   - `src/app/(protected)/dashboard/page.tsx` and `src/app/(protected)/admin/users/page.tsx` still import `NvButton`, `NvAlert`, `NvLoader`.
   - `package.json` still depends on `@nova-design-system/nova-base`, `@nova-design-system/nova-react`, `@nova-design-system/nova-webcomponents`, `@stencil/react-output-target`.
3. **Local primitives already approximate v2** but drift on details:
   - `Button` is missing the `ai` variant (gradient indigo/purple + `shadow-ai`), `xs` size, and uses `shadow-sm` instead of `shadow-primary` on default.
   - `Badge` is missing `info`, `skill-*` (technical/leadership/behavioural/communication/domain), and parameterised status variants for hiring-plan & candidate states.
   - `Card` lacks v2's "with top accent stripe", "highlighted/selected", "dark", "form (sunken)", and "glass" presets.
   - No `Toast`, no `DropdownMenu`, no `EmptyState`, no `AiInsight`, no `SkillChip`, no `KpiCard`, no `CandidateCard`, no `StageColumn` shared components.
4. **Sidebar / TopBar drift from v2 mockups**: width is `w-64` (256px) vs v2 `--sidebar-width: 240px`; nav-item radius is `rounded-xl` (12px) vs v2 `10px`; sidebar footer copy still reads "Nova Design".
5. **Dashboard page is a one-off** that has its own KPI card markup, its own funnel bar markup, and Nv* imports — it does not use any shared `KpiCard` / `ChartCard`.
6. **Pipeline kanban** (`components/hiring-plans/kanban-board.tsx`) likely doesn't yet match the v2 column spec (268px columns, SLA meta row, candidate card layout with score/days badges).
7. **Public landing & marketing pages** were built independently of v2.

---

## 3. Phasing (small, reviewable PRs, each ships green)

### Phase 0 — Plan ratification (this doc)
No code change. User reviews this plan, picks scope/sequencing.

### Phase 1 — Token foundation
**Goal:** make `globals.css` a complete projection of `design-system-v2/tokens.css` with no Nova bleed.
- Replace the contents of `src/app/globals.css` with: `@import "tailwindcss";` + the entire v2 token block (typography scale, full color ramps, semantic aliases, gradients, spacing, radius, shadows, motion, z-index, component sizing, chart tokens) + the v2 utility classes (`.text-gradient`, `.card`, `.glass`, `.shimmer`, `.dot-grid`, `.focus-ring`, `.divider`, `.scrollbar-thin`).
- Keep the existing `@theme { ... }` block but feed it from the new tokens (so Tailwind utilities like `bg-background`, `border-border`, `text-foreground` keep working unchanged).
- Remove `@import "@nova-design-system/nova-base/dist/css/spark.css";` and the `--leading-*` patch.
- Drop `nv-button` / `nv-badge` overrides.
- Wire Inter via `next/font/google` in `src/app/layout.tsx` (assigning `--font-sans`) and stop relying on the Google Fonts `@import` inside `tokens.css` — keep the `@import` only for prototypes.
- **Acceptance:** type-check + dev-server smoke; every existing page renders with no visual regression beyond intended token adoption.

### Phase 2 — Excise Nova design system
**Goal:** zero Nova references in source or `package.json`.
- Replace `NvButton` / `NvAlert` / `NvLoader` usages in `dashboard/page.tsx` and `admin/users/page.tsx` with local `Button` + a new `Alert` primitive + the existing spinner pattern.
- Delete `src/components/nova-provider.tsx`, remove `<NovaProvider>` wrap from `src/app/(protected)/layout.tsx` (and any other layout / public layout).
- Remove from `package.json` (frontend): `@nova-design-system/nova-base`, `@nova-design-system/nova-react`, `@nova-design-system/nova-webcomponents`, `@stencil/react-output-target`. Run `npm install` to refresh the lockfile.
- **Acceptance:** `grep -r "@nova-design-system\|nv-\|NovaProvider\|defineCustomElements"` returns nothing in `frontend/src`; `npm run build` succeeds.

### Phase 3 — Primitive component refresh
**Goal:** every `src/components/ui/*` file matches `design-system-v2/CLAUDE.md` exactly.

For each primitive, **edit in place** (don't fork). Updates:
- **Button** (`button.tsx`): default → `bg-indigo-600 text-white shadow-primary hover:bg-indigo-700 hover:shadow-primary-lg`. Add `ai` variant (`bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-ai hover:brightness-110`). Add `xs` size (h-7 px-2.5 text-xs). Confirm `secondary`, `outline`, `ghost`, `destructive`, `link` variants and `default`/`sm`/`lg`/`icon`/`icon-sm` sizes match v2.
- **Badge** (`badge.tsx`): keep current variants; add `info` (blue), `skillTechnical`, `skillLeadership`, `skillBehavioural`, `skillCommunication`, `skillDomain`. Add a `<StatusBadge status={"DRAFT"|"ACTIVE"|"COMPLETED"|"CANCELLED"}/>` helper (or extend `variant` enum) for hiring plans, and `<CandidateStatusBadge>` for candidate state.
- **Card** (`card.tsx`): keep core; add optional `accent?: "indigo"|"cyan"|"emerald"|"amber"|"red"|"purple"` prop that renders the 0.5px top gradient stripe. Add `<Card variant="dark"|"sunken"|"glass"|"highlighted">` presets. Centralize `card-hover` here.
- **Input** (`input.tsx`): height `h-10`, `rounded-lg`, focus ring `ring-2 ring-indigo-500/20`. Add `error?: boolean` and a left-icon slot to remove the wrapper boilerplate currently spread around the codebase.
- **Tabs** (`tabs.tsx`): list → `bg-slate-100/80 rounded-xl p-1`; trigger → `rounded-lg`, active state `bg-white shadow-sm`.
- **Progress** (`progress.tsx`): track `bg-slate-100 rounded-full h-2`; fill `bg-gradient-to-r from-indigo-500 to-cyan-500` (also accept `variant="amber"` for at-risk).
- **Avatar** (`avatar.tsx`): default fallback is `bg-gradient-to-br from-indigo-500 to-cyan-500 text-white font-bold`. Sizes `xs/sm/md/lg/xl` from v2 sizing tokens. Add `<AvatarStack/>` for interview-panel rows.
- **Acceptance:** Storybook-style smoke page (or just visual check on Dashboard / Hiring Plans / Kanban) shows variants render; all current call sites still type-check.

### Phase 4 — New shared primitives
**Goal:** stop hand-rolling these in pages.

Add under `src/components/ui/`:
- **Alert** — info/success/warning/danger variants (replaces `NvAlert`).
- **Toast** + `useToast` hook (sonner-style) — surface for "Hiring plan created", "SLA breached", "AI generation failed" per `preview/components.html`.
- **DropdownMenu** — wrap a small headless implementation; styled per v2 (`rounded-xl`, `shadow-dropdown`, `dd-item` rows with danger row for destructive actions).
- **EmptyState** — circular icon, title, description, optional CTA (`primary` or `ai` variant). Two presets used today: empty hiring-plans, empty AI insights.
- **Skeleton / Shimmer** — already have `.shimmer` global; add a typed `<Skeleton variant="line"|"circle" />` so pages stop reaching for raw className.

Add under `src/components/shared/` (composite, but cross-page):
- **KpiCard** — props: `{ title, value, icon, iconBg, accent, trend? }`; renders the v2 KPI card (top accent stripe, icon tile, trend row).
- **AiInsightCard** — props: `{ severity: "info"|"warning"|"critical", title, description, recommendation, category }`; severity drives bg/border/icon per v2 `severityConfig`.
- **PageHeader** — `{ title, subtitle?, actions? }`; standardizes the title+subtitle+CTA row used on every page.
- **DataTable** — thin wrapper around `<table>` that owns the v2 styles (uppercase 10px headers, hover row, pagination footer with prev/next).
- **CandidateCard** — for kanban; encapsulates avatar/name/role/score-badge/days-badge/footer logic, including `slaClass` and `scoreClass` helpers from v2.

**Acceptance:** new components have basic prop docs (JSDoc), are imported by Phase 5 refactors.

### Phase 5 — App Shell refactor (Sidebar / TopBar / Protected layout)
**Goal:** the chrome matches the `ui-kit/*` shell.
- `Sidebar`: `w-60` (240px) instead of `w-64`; nav items `rounded-[10px]` instead of `rounded-xl`; logo box `rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700` (already correct); rewrite the "Nova Design" footer widget to a generic "Workspace upgrade / AI Assistant" placeholder block (or remove if no CTA defined) — the copy must not reference Nova.
- `TopBar`: 64px height, search-box left (existing `<GlobalSearch/>`), notification bell + user menu right; promote the user-menu chevron + dropdown styles to use the new `<DropdownMenu>` primitive.
- `(protected)/layout.tsx`: remove `NovaProvider`; main padding `p-6`; the loading spinner uses the v2 spinner pattern (already aligned).
- **Acceptance:** sidebar/topbar in dev visually matches `ui-kit/01-Dashboard.html` at 1440×900.

### Phase 6 — Priority pages (one PR each, biggest visual lift)
1. **Dashboard** (`(protected)/dashboard/page.tsx`)
   - Strip Nv* imports; replace KPI markup with `<KpiCard>` ×4; replace funnel bars / progress lists / charts with the v2 shell structure but keep Recharts (apply v2 chart tokens).
   - AI insights row → `<AiInsightCard>` ×N inside an "insights-card" container with the tri-color top accent stripe.
   - Page header → `<PageHeader title="Dashboard" subtitle="Hiring analytics overview" actions={<RefreshButton/>}/>`.
2. **Hiring Plans list** (`(protected)/hiring-plans/page.tsx`)
   - Filter bar in a `Card`; table via `<DataTable>` with mini-progress in the "Progress" column and `<StatusBadge>` in "Status"; right-side detail pane (per `02-HiringPlans.html`) is optional v2 feature — gate behind a flag, default to current full-width list to keep this PR small.
3. **Pipeline Kanban** (`components/hiring-plans/kanban-board.tsx`)
   - Column width 268px, header with stage icon tile + count pill, SLA meta row (`Avg Xd · SLA Yd` colored by `slaClass`).
   - Cards via `<CandidateCard>`; preserve dnd-kit wiring as-is.
   - Stats strip above the board (totals + selected + rejected dots).

### Phase 7 — Cascading refactor (modules)
Run module-by-module. Each is a small PR limited to swapping ad-hoc class strings for the new primitives and aligning to v2 patterns. No behavior change.
- `(protected)/candidates/*` (list + detail)
- `(protected)/offers/*`
- `(protected)/bgv/*`
- `(protected)/appraisal/*`
- `(protected)/compensation/*`
- `(protected)/training/*`
- `(protected)/admin/*` (users page + reports)
- `(protected)/hiring-plans/[id]` and `hiring-plans/new` (the form-heavy pages — use Card variant `sunken` for form containers)

### Phase 8 — Public surfaces
Apply v2 only after the app shell ships, so brand stays consistent.
- `(public)/page.tsx` (landing), `jobs`, `joining`, `offer`, `peer-feedback`, `bgv`, `contact`, plus the legal pages (`privacy-policy`, `terms-of-service`, `cookie-policy`, `gdpr`).
- Use the v2 brand gradient (`--gradient-brand`), `dot-grid` background utility, and `glass` cards for the marketing site.

### Phase 9 — Hardening
- Visual review pass against the three v2 mockup HTMLs at 1440×900 and one mobile breakpoint.
- Add a `frontend/src/components/ui/README.md` mapping each component to its v2 spec section in `design-system-v2/CLAUDE.md` so the next contributor doesn't drift.
- (Optional) snapshot tests on KpiCard / AiInsightCard / CandidateCard / DataTable using Playwright component testing or a simple Storybook with Chromatic.

---

## 4. File-Level Change Map

| Area | File(s) | Action |
|------|---------|--------|
| Tokens | `src/app/globals.css` | Replace token block with v2; drop spark.css import; keep tailwind import |
| Tokens | `src/app/layout.tsx` | Wire Inter via `next/font/google` → `--font-sans` |
| Nova | `src/components/nova-provider.tsx` | Delete |
| Nova | `src/app/(protected)/layout.tsx` | Remove `NovaProvider` wrap |
| Nova | `src/app/(protected)/dashboard/page.tsx`, `src/app/(protected)/admin/users/page.tsx` | Replace `NvButton/NvAlert/NvLoader` with local primitives |
| Nova | `package.json` | Drop `@nova-design-system/*`, `@stencil/react-output-target` |
| Primitives | `src/components/ui/{button,badge,card,input,tabs,progress,avatar,select,slider,textarea,label}.tsx` | Edit to v2 spec |
| Primitives (new) | `src/components/ui/{alert,toast,dropdown-menu,empty-state,skeleton}.tsx` | Add |
| Shared (new) | `src/components/shared/{kpi-card,ai-insight-card,page-header,data-table,candidate-card}.tsx` | Add |
| Shell | `src/components/sidebar.tsx` | Width 240, radius 10, drop "Nova" copy |
| Shell | `src/components/top-bar.tsx` | Use `DropdownMenu` for user menu |
| Pages | `dashboard/page.tsx`, `hiring-plans/page.tsx`, `components/hiring-plans/kanban-board.tsx` | Refactor to v2 mockups |
| Modules | `(protected)/{candidates,offers,bgv,appraisal,compensation,training,admin}/**` | Cascade primitives |
| Public | `(public)/**` | Brand alignment last |

---

## 5. Risks & Mitigations
- **Nova removal breaks two pages.** Mitigated by Phase 2 doing the swap in the same PR that uninstalls the deps; `Alert` and the spinner pattern need to land before `npm uninstall`.
- **Tailwind v4 + custom token CSS interaction.** Tailwind v4's `@theme` already reads custom properties; the v2 tokens keep names compatible (`--color-primary`, `--radius`, etc.). Migration is additive.
- **Visual regressions on long-tail pages.** Phase 7 keeps each module PR-sized; reviewer can spot regressions by walking the route list.
- **Sidebar width change (256 → 240).** Sub-content pages assume `w-64`; grep `pl-64`, `ml-64`, `w-64` and update — but the layout uses flex, so the impact is small.
- **lucide-react version (`^1.6.0`)** — current entry is unusual; keep as-is unless an icon used by v2 (e.g. `Sparkles`, `CalendarClock`) is missing, in which case bump to the latest.

---

## 6. Definition of Done
- Zero references to `@nova-design-system` in source or `package.json`.
- `design-system-v2/CLAUDE.md` Section 11 ("DO's and DON'Ts") audit passes — grep for `text-black`, `bg-black`, raw `#000`/`#fff` outside the slate scale; all icons import only from `lucide-react`.
- Dashboard, Hiring Plans list, and Pipeline Kanban look like their v2 mockups at desktop width.
- Every primitive in `src/components/ui/` has a one-line JSDoc tying it to the v2 component section it implements.
- `npm run build` succeeds; `npm run lint` clean.

---

## 7. Suggested execution order (small PRs)
1. PR-1: Phase 1 (tokens) — pure CSS / font wiring.
2. PR-2: Phase 4 minimum (`Alert` primitive only) — unblocks Nova removal.
3. PR-3: Phase 2 (Nova removal end-to-end).
4. PR-4: Phase 3 (primitive refresh).
5. PR-5: Phase 4 remainder + Phase 5 (shell).
6. PR-6: Dashboard (Phase 6.1).
7. PR-7: Hiring Plans list (Phase 6.2).
8. PR-8: Pipeline Kanban (Phase 6.3).
9. PR-9..N: Phase 7 modules, one per PR.
10. PR-Final: Phase 8 public surfaces + Phase 9 hardening.
