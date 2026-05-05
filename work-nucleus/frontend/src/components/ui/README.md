# UI Primitives — Work Nucleus

Low-level building blocks consumed by every page. Each primitive is a thin wrapper that owns the v2 visual contract — callers should _not_ re-style them with ad-hoc Tailwind classes when a variant or prop already covers the case.

**Spec:** [`design-system-v2/CLAUDE.md`](../../../../design-system-v2/CLAUDE.md) is authoritative. If a primitive disagrees with the spec, the primitive is wrong — open a fix.

**Conventions:**
- `cn()` from `@/lib/utils` for class merging (clsx + tailwind-merge)
- `class-variance-authority` for typed variants
- `React.forwardRef` + `displayName` on every component
- Brand color is **indigo-600** — never hard-code another primary
- Brand gradient is **indigo-500 → cyan-500** — use the `.text-gradient` / `var(--gradient-brand)` utilities, not hand-rolled `bg-gradient-to-r from-... to-...`
- For modal scrims use `bg-slate-900/40 backdrop-blur-sm`, not raw `bg-black`

---

## Index

| Component | Variants / sizes | Spec section |
|---|---|---|
| **`alert.tsx`** — inline alert + `AlertTitle` + `AlertDescription` | variant: `info` / `success` / `warning` / `destructive`. Absolutely-positioned svg icon, siblings get `pl-7` | CLAUDE.md §7 (severity colors mirror insight-card) |
| **`avatar.tsx`** — `Avatar` + `AvatarImage` + `AvatarFallback` + `AvatarStack` | size: `xs/sm/md/lg/xl`. Default fallback = brand gradient | CLAUDE.md §4 (Avatar) |
| **`badge.tsx`** — `Badge` + `StatusBadge` + `CandidateStatusBadge` | variant: `default/secondary/destructive/outline/success/warning/info` plus 5 `skill*` variants (Technical/Leadership/Behavioural/Communication/Domain). Status helpers map domain enums → variant | CLAUDE.md §4 (Badges + Skill categories + Status badges) |
| **`button.tsx`** | variant: `default/destructive/outline/secondary/ghost/link/ai`. size: `xs/sm/default/lg/icon/icon-sm`. `default` uses `shadow-primary`. `ai` uses `--gradient-ai` + `--shadow-ai` | CLAUDE.md §4 (Button) |
| **`card.tsx`** — `Card` + `CardHeader/Title/Description/Content/Footer` | variant: `default/sunken/glass/highlighted/dark`. `accent` prop renders the v2 0.5px gradient stripe (auto-applies `overflow-hidden`) | CLAUDE.md §4 (Card) |
| **`dropdown-menu.tsx`** — `DropdownMenu` + `Trigger` + `Content` + `Item` + `Separator` + `Label` | Headless React-context implementation (no extra dep). `Item.variant: default \| danger`. `Trigger` supports `asChild`. Click-outside + Escape close. Mirrors Radix's API surface | preview/components.html (Dropdown Menu) |
| **`empty-state.tsx`** | Circular icon tile + title + optional description + optional action. Dashed slate-200 border per v2 | preview/components.html (Empty States) |
| **`input.tsx`** | `error?: boolean` toggles red border + ring + `aria-invalid`. `leftIcon?: ReactNode` renders 16px icon at `left-3` with the input padded to clear it | CLAUDE.md §4 (Input) |
| **`label.tsx`** | Standard form label. Pair with primitives that accept `id` | shadcn convention |
| **`progress.tsx`** | variant: `default` (brand gradient) / `amber` (at-risk). ARIA `role="progressbar"` + valuenow/min/max | CLAUDE.md §4 (Progress) |
| **`select.tsx`** | Native `<select>` styled with v2 input shape + chevron-down icon | CLAUDE.md §4 (Input pattern) |
| **`skeleton.tsx`** | variant: `line/circle/block`. Uses the global `.shimmer` animation | CLAUDE.md §7 (Loading states) |
| **`slider.tsx`** | Native range input with v2 styling | (no specific spec section) |
| **`spinner.tsx`** | size: `xs/sm/md/lg`. tone: `primary/muted/white`. `role="status"` + `aria-label` | CLAUDE.md §7 (Loading states) |
| **`tabs.tsx`** — `Tabs` + `TabsList` + `TabsTrigger` + `TabsContent` | List `bg-slate-100/80 rounded-xl p-1`. Active trigger `bg-white shadow-sm` | CLAUDE.md §4 (Tabs) |
| **`textarea.tsx`** | Same shape as Input | CLAUDE.md §4 (Input) |
| **`toaster.tsx`** — `Toaster` + re-exports `toast` | Wraps `sonner` with v2 styling. Mounted once in `app/layout.tsx`. Callers `import { toast } from "@/components/ui/toaster"` | preview/components.html (Toasts) |

---

## Adding a new primitive

1. **Check the spec first.** If the v2 mockups don't show your component, talk to design before inventing one.
2. **Match the file naming.** Lowercase kebab — `dropdown-menu.tsx`, not `DropdownMenu.tsx`.
3. **Follow the primitive contract:**
   - `forwardRef` on every component, `displayName` set
   - Variants via `cva` if there are 3+ shapes, otherwise inline conditionals are fine
   - `cn()` for merging, never raw template strings
   - One JSDoc comment at the top of each `cva()` declaration tying back to the v2 spec section
4. **Add to this README's index.**
5. **Don't import from `lucide-react@^1.6.0` icons you can't verify exist.** This package's version is older than the modern lucide-react; stick to icons already used elsewhere in the codebase.

## Where to find values

- **Tokens** (color ramps, spacing, radius, shadows, motion, sizing, gradients, chart colors): CSS variables at `:root` in `src/app/globals.css`. Sourced from `design-system-v2/tokens.css`.
- **Tailwind utilities**: scoped to `@theme` in `globals.css`. Use Tailwind classes for one-off styling and `var(--token-name)` only inside `[arbitrary]` values.
- **Mockups**: `design-system-v2/ui-kit/{01-Dashboard,02-HiringPlans,03-Pipeline-Kanban}.html` for full-page references.
