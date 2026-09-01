# Eighth sweep — findings (all verified against the running app)

## A. Security
A1  11 write endpoints emit no audit entry, against CLAUDE.md's "All write operations
    must emit audit log events". VERIFIED: 4 writes -> 0 new audit rows.
    saved-views (create/update/delete/setDefault), alert-rules (create/update/delete),
    user-notifications (read/dismiss/snooze/read-all).

## B. Dead code
    Clean. knip (frontend), detekt (backend), 0 unmapped DB columns, 0 unused config
    keys, 0 dead enum values, 0 dead DTO fields, 0 unreferenced Kotlin symbols.

## C. Improvements / optimisation
C1  Every list sort is a filesort. `sortOf` appends `.and(Sort.by(ASC, "id"))` for
    stable pagination, so a single-column index can never satisfy the sort — EXPLAIN
    shows "Using filesort" even for indexed columns like audit_logs.timestamp.
    Invisible at 530 rows; a full scan per page on a table that grows forever.
C2  16 of 30 sortable columns have no index at all (row 12.3 claimed coverage).

## D. Bugs
D1  Blank names accepted on asset-types, certificate-types, application-types —
    creating an unnamed row. The other seven collections correctly return 400.
D2  saved-views accepts a blank name, a blank entityType, and a configuration that
    is not JSON. `applyView` parses it in a try/catch, so a bad row silently does
    nothing forever.
D3  Over-length input returns 409 "A data conflict occurred" instead of 400. The
    handler maps every DataIntegrityViolationException to 409, conflating duplicate
    keys with length and foreign-key violations.

## Verified clean this sweep
    authz on all 186 handlers; no N+1 on any of 15 list endpoints (query count flat
    from pageSize 1 to 50); npm audit 0 (shipped and dev); no secrets in tracked
    files; archive+restore round-trips on all 10 collections; detail endpoints on
    all 10; sort parameters are allow-listed with a safe default.
