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

Every list page must use the shared `DataTable` component (`src/components/data-table.tsx`), built on TanStack Table.

Future features (not yet implemented):
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
