# Lessons Learned

## 2026-02-06: shadcn/ui component path resolution

**What happened**: `npx shadcn@latest add` created components at `apps/web/@/components/ui/` instead of `apps/web/src/components/ui/`. The `@` alias in `components.json` was interpreted literally rather than resolved through tsconfig.

**Fix**: Changed `components.json` aliases from `@/components` to `src/components` (using relative paths). Moved files to the correct location.

**Rule**: When configuring shadcn/ui with Vite + path aliases, use relative paths (e.g., `src/components`) in `components.json`, not the tsconfig alias (`@/components`).

**Update (2026-02-07)**: Reversed — now using `@/` aliases in `components.json` since Vite resolves them correctly at dev time. The `src/` paths broke production builds (`vite build`) because Rollup couldn't resolve them. After `npx shadcn@latest add`, always check new files for `from "src/..."` imports and replace with `from "@/..."`.

## 2026-02-07: Always update tasks/todo.md before committing

**What happened**: Completed the Locations UI milestone but forgot to update `tasks/todo.md` to mark items done and reflect new completed work.

**Rule**: Before committing, always update `tasks/todo.md` — check off completed items and add new "Done" entries for work that was finished.
