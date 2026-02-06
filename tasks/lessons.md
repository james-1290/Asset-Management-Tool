# Lessons Learned

## 2026-02-06: shadcn/ui component path resolution

**What happened**: `npx shadcn@latest add` created components at `apps/web/@/components/ui/` instead of `apps/web/src/components/ui/`. The `@` alias in `components.json` was interpreted literally rather than resolved through tsconfig.

**Fix**: Changed `components.json` aliases from `@/components` to `src/components` (using relative paths). Moved files to the correct location.

**Rule**: When configuring shadcn/ui with Vite + path aliases, use relative paths (e.g., `src/components`) in `components.json`, not the tsconfig alias (`@/components`).

**Update (2026-02-06)**: Reversed — now using `@/` aliases in `components.json` since Vite resolves them correctly at dev time. The `src/` paths broke production builds (`vite build`) because Rollup couldn't resolve them. After `npx shadcn@latest add`, always check new files for `from "src/..."` imports and replace with `from "@/..."`.

## 2026-02-06: Always update tasks/todo.md before committing

**What happened**: Completed the Locations UI milestone but forgot to update `tasks/todo.md` to mark items done and reflect new completed work.

**Rule**: Before committing, always update `tasks/todo.md` — check off completed items and add new "Done" entries for work that was finished.

## 2026-02-06: Restart API after backend changes

**What happened**: Added new `AssetsController` and `IAuditService`, verified `dotnet build` passed, but didn't restart the running API process. The user navigated to `/assets` and got "Failed to load assets" because the old process didn't have the new controller.

**Rule**: After any backend code change (new controllers, modified endpoints, DI registration changes), always restart the running API. Kill the old process and run `dotnet run` again. Don't assume `dotnet build` alone is enough — the running process uses the old binary.

## 2026-02-06: CHANGELOG timestamps were wrong

**What happened**: Multiple CHANGELOG entries had incorrect dates (2026-02-07 instead of 2026-02-06) and made-up times. The system-provided date was used instead of checking the actual system clock. All work was done on 2026-02-06 but 6 out of 8 entries showed 2026-02-07.

**Rule**: NEVER use the system-provided date for CHANGELOG timestamps. Always run `date '+%Y-%m-%d %H:%M'` to get the real current date and time before writing a CHANGELOG entry.

## 2026-02-06: Restart API — repeat offence (people search endpoint)

**What happened**: Added `GET /api/v1/people/search` endpoint but only ran `dotnet build` — didn't restart the API. The combobox showed no results because the endpoint returned 404. Same mistake as the Assets controller incident above.

**Reinforced rule**: After ANY backend C# change, the verification loop MUST be: `dotnet build` → kill API → `dotnet run` → `curl` the new/changed endpoint → confirm correct response. Never skip the restart + curl steps.
