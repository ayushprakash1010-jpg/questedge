# Shared Composites — QuestEdge

Cross-page composite components. These compose primitives from `../ui/` into the recurring page-level patterns the v2 mockups specify (KPI grids, AI-insight rows, page headers, data tables, kanban candidate cards).

**Spec:** [`design-system-v2/CLAUDE.md`](../../../../design-system-v2/CLAUDE.md) §5 (Layout) and §6 (Kanban).

**Difference from `../ui/`:** primitives are stateless visual atoms with no domain knowledge. Composites encode page-level patterns and may pull in domain semantics (e.g., `CandidateCard` knows what "SLA breach" colors look like).

---

## Index

### `page-header.tsx`
Title + subtitle + optional eyebrow + optional actions slot. Used as the first child of every protected page.

```tsx
<PageHeader
  title="Hiring Plans"
  subtitle="Manage your hiring plans and positions"
  eyebrow="Workspace"             // optional uppercase indigo label
  actions={<Button>Create New</Button>}
/>
```

Spec: CLAUDE.md §5 (Page header pattern).

---

### `kpi-card.tsx`
Dashboard summary card. `accent` drives both the gradient top stripe and the icon-tile colors; callers can override the tile via `iconBg` / `iconColor` if needed.

```tsx
<KpiCard
  title="Active Plans"
  value={48}
  subValue="+2 this month"        // optional
  icon={<ClipboardList />}
  accent="indigo"                 // indigo / cyan / emerald / amber / red / purple
  trend={{ label: "+2 this month", direction: "up" }}
  onClick={() => router.push(...)}// optional, makes the card clickable
/>
```

Built on `<Card accent={...}>` (PR-4) + `.card-hover`. Spec: CLAUDE.md §5 (KPI card grid).

---

### `ai-insight-card.tsx`
AI-generated recommendation card. Three severities map 1:1 to the v2 `severityConfig`. Optional recommendation block renders inside a tinted-white sub-card with severity-tinted border.

```tsx
<AiInsightCard
  severity="warning"              // info / warning / critical
  title="Feedback bottleneck"
  description="5 candidates awaiting Round 2 feedback for 5+ days."
  recommendation="Send reminders to interviewers assigned to Technical Round 2."
  category="Risk"                 // optional outline Badge
/>
```

Spec: CLAUDE.md §7 (AI insight card).

---

### `data-table.tsx`
Headless table primitives. Each piece is a thin wrapper that owns v2 styling — callers compose normally:

```tsx
<DataTable>
  <DataTableHeader>
    <tr>
      <DataTableHead>Name</DataTableHead>
      <DataTableHead className="text-right">Actions</DataTableHead>
    </tr>
  </DataTableHeader>
  <DataTableBody>
    <DataTableRow selected={isExpanded} onClick={() => router.push(...)}>
      <DataTableCell>…</DataTableCell>
      <DataTableCell className="text-right" onClick={e => e.stopPropagation()}>
        <DropdownMenu>…</DropdownMenu>
      </DataTableCell>
    </DataTableRow>
  </DataTableBody>
  <tfoot>
    <tr>
      <td colSpan={2} className="p-0">
        <DataTablePagination
          page={meta.page}
          pageSize={20}
          total={meta.total}
          onPageChange={(p) => fetchPage(p)}
        />
      </td>
    </tr>
  </tfoot>
</DataTable>
```

When nesting inside a `<Card>`, pass `className="rounded-none border-0 shadow-none"` so the inner table doesn't double-border with the card surface (see PR-6 dashboard, PR-11 BGV detail).

Spec: CLAUDE.md §5 (Data table pattern).

---

### `candidate-card.tsx`
Pipeline kanban card. Score prefers `totalScore`, falls back to `aiMatchScore`. Helpers `slaBadgeClass` and `scoreBadgeClass` are exported so any caller (e.g., the column-level avg-vs-SLA meta row) can re-use the same color logic.

```tsx
<CandidateCard
  name="Priya Sharma"
  role="Senior PM @ ACME"          // optional
  score={82}                       // optional, drives 75/50 thresholds
  daysInStage={4}
  slaMaxDays={7}                   // drives 0.5/1.0 ratio thresholds
  yearsExperience={6}              // optional footer
  feedbackCount={2}                // optional footer
  isDragging={dragging}            // applies the v2 dragging visual
  draggable
  onDragStart={...}
  onClick={() => onCandidateClick(c.applicationId)}
/>
```

Spec: CLAUDE.md §6 (Kanban) + ui-kit/03-Pipeline-Kanban.html.

---

## Where to find values

- **Tokens** (color, spacing, radius, shadow, motion, sizing, chart colors): CSS variables at `:root` in `src/app/globals.css`.
- **Mockups**: `design-system-v2/ui-kit/{01-Dashboard,02-HiringPlans,03-Pipeline-Kanban}.html`.
- **Primitives reference**: [`../ui/README.md`](../ui/README.md).
