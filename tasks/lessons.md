# Lessons Learned

## 2026-02-06: shadcn/ui component path resolution

**What happened**: `npx shadcn@latest add` created components at `apps/web/@/components/ui/` instead of `apps/web/src/components/ui/`. The `@` alias in `components.json` was interpreted literally rather than resolved through tsconfig.

**Fix**: Changed `components.json` aliases from `@/components` to `src/components` (using relative paths). Moved files to the correct location.

**Rule**: When configuring shadcn/ui with Vite + path aliases, use relative paths (e.g., `src/components`) in `components.json`, not the tsconfig alias (`@/components`).
