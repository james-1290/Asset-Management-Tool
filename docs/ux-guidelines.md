# UX Guidelines

## Component Library

Use **shadcn/ui** (New York style) for all UI components. Do not hand-roll UI primitives. All shadcn components are in `src/components/ui/`.

To add a new shadcn component:

```bash
cd apps/web
npx shadcn@latest add <component-name>
```

## Layout

Every page uses the shared `Layout` component which provides:

- **Sidebar** (collapsible): Navigation links to all sections
- **Header**: Sidebar trigger + theme toggle
- **Main content area**: Rendered via React Router `<Outlet />`

## Theme

Three modes: **light**, **dark**, **system** (auto). Managed centrally via:

- CSS variables in `src/index.css`
- `useTheme` hook in `src/hooks/use-theme.ts`
- `ThemeToggle` dropdown in the header

No page-specific theme logic. All components inherit theme from CSS variables.

## Typography & Spacing

- Page titles: `text-2xl font-semibold tracking-tight`
- Page subtitles: `text-muted-foreground mt-1`
- Content padding: `p-6` (set by Layout)
- Consistent spacing via Tailwind utility classes

## Data Tables

Every list page must use the shared `DataTable` component (`src/components/data-table.tsx`), built on TanStack Table. It provides:
- Server-side pagination, sorting, filtering
- Column show/hide toggle
- Saved views per user
- Default view per user
- Bulk actions via checkbox selection + action bar

## Forms

Use a consistent form pattern across the app:
- shadcn/ui form components (Input, Select, etc.)
- Consistent validation and error message display
- Modal forms via `Dialog` component for create/edit operations
- Confirmation dialogs for destructive actions

## Navigation

Sidebar items with Lucide icons:
- Dashboard
- Assets
- Certificates
- Applications / Licences
- Locations
- Audit Log
- Settings

Active route is highlighted in the sidebar.

## Notifications

Use shadcn/ui `Toast` for success/error notifications (to be added).

## Responsive Design

Sidebar collapses on mobile via the shadcn/ui Sidebar component. All content should be usable on tablet and desktop screens.

---

# The list-page contract

Every list page is built from the same parts, in the same order. A list that
omits one of these is a bug unless the capability behind it genuinely does not
exist in the API.

## Required on every list

| Part | Component | Notes |
|---|---|---|
| Title + breadcrumbs | `PageHeader` | `title`, `breadcrumbs`, `description` showing the total count |
| Table | `DataTable` | `variant="borderless"`, server-side paging/sorting/filtering |
| Pagination | `DataTablePagination` | Passed as the table's `pagination` slot |
| Row actions | columns factory | Takes `canWrite`; a read-only viewer gets no actions column |

## Required when the API supports it

| Control | Component | Include when |
|---|---|---|
| Search box | `Input`, in the page's toolbar | the list endpoint takes a `search` parameter |
| Column chooser | `ColumnToggle` | any column is hideable — always true where custom fields exist |
| Saved views | `SavedViewSelector` | the list is one a user would return to with a set-up |
| Export | `ExportButton` | an `/export` endpoint exists |
| Grouped view | `ViewModeToggle` | the page renders `GroupedGridView` |
| Bulk actions | `BulkActionBar` | a `bulk-archive` or `bulk-status` endpoint exists |
| Active filters | `ActiveFilterChips` | the list has filters beyond a single chip |

Row density is **not** in that table: `DataTable` renders `DensityToggle`
itself, so every list has it without opting in. The choice is one app-wide
setting (`useDensity`, persisted to `localStorage`), because someone who wants
dense rows wants them everywhere — and a per-page choice is how this control
came to exist on exactly one list.

## Ordering within the toolbar

One row. Left group: search box, then filter chips, then a "More filters"
popover for anything that does not fit, then the column chooser. Right group, in
this order: saved views, a divider, view-mode toggle, export. The density toggle
is appended by `DataTable` beyond the right group.

The page header holds only the title, breadcrumbs, record count and the primary
"Add …" button — never the view controls.

## Copy

Search placeholders name what is being searched — "Search assets…", not
"Search...". Use the ellipsis character, not three dots.

## Accessibility

Icon-only controls need an accessible name. A tooltip is **not** an accessible
name, and neither is a label that shows the current *value* (the saved-view
button reads "Default", so it carries `aria-label="Saved views"`). Use
`aria-label`, or an `sr-only` span where the codebase already does that for row
menus.

## How this is enforced

`apps/web/e2e/qa/uniformity.spec.ts` holds the contract as a table of every list
and which capabilities it has. It asserts the controls are present across the
whole set, so a single page that drifts fails the suite. When a list genuinely
should not have a control, set it to `false` there with the reason — the
exception then has to be argued for rather than silently assumed.

## Resolved divergences

The table-density toggle was once on Applications alone, hand-rolled from bare
`<button>` elements. It now lives in `DataTable`, built on the shared shadcn
primitives to the same shape as `ViewModeToggle`, and every list has it.

The Assets list kept its saved views, view-mode toggle and export in the *page
header* rather than the toolbar. They have moved to the toolbar's right group,
so all three major lists now read identically.
