# Operations

What has to be true in the deployed environment, and what the application
deliberately does not do for itself.

## Backup and restore

The application performs no backups of its own. It holds every record in MySQL
and every attachment in blob storage, so both have to be covered by the platform:

| What | Where it lives | How it is protected |
|---|---|---|
| All records, audit log, history | Azure Database for MySQL | Automated backups (retention set on the server; 7 days is the default, 35 the maximum). Point-in-time restore. |
| Attachments and model images | Azure Blob Storage | Enable soft delete for blobs and containers, and versioning. Neither is on by default. |
| Configuration and secrets | App Service settings / Key Vault | Held outside the database; re-applied by deployment, not restored from it. |

Two things worth knowing before an incident rather than during one:

- **A restore is point-in-time for the database only.** Attachments live
  elsewhere and are not restored with it, so a database rolled back an hour will
  reference blobs uploaded since. The records will show attachments that no
  longer match. Restoring both to the same moment needs blob versioning enabled.
- **Archiving is not deletion.** Every "delete" in the product is a soft delete
  and the row remains, so a restore is rarely the right answer to "someone
  deleted a record" — the record can be restored in the app itself.

Verify a restore works before you need it. An untested backup is a hypothesis.

## Personal data

People records hold names, email addresses, departments and job titles. The
audit log and the per-record history hold names alongside what was changed, so
personal data is spread across three places.

**Decided: erasure is not required.** The product holds internal employee
records only, so there is no subject-erasure obligation to satisfy. What follows
records the position and what would change it, rather than an open action.

**There is no erasure function.** Archiving a person hides them and frees their
assignments; it does not remove their data, and the audit log keeps their name
against everything they did. That is deliberate — an audit trail that can be
edited is not an audit trail — but it means a subject-access erasure request
cannot be satisfied through the product today. Doing so needs a decision about
what the audit log should say afterwards, and the honest options are:

1. **Pseudonymise.** Replace the name with a stable opaque reference everywhere,
   keeping the trail intact and its subject unidentifiable. Usually the right
   answer, and the only one that preserves the audit trail.
2. **Redact.** Blank the personal fields and mark the record redacted, leaving
   an obvious hole. Simpler, and loses the ability to answer "who did this".
3. **Delete outright.** Removes the person and cascades through history.
   Destroys the audit trail for their actions.

None of these is implemented, and none needs to be while the records are
internal employees only. What would change that: using the product for
contractors, customers, or anyone outside the organisation. At that point the
choice above has to be made before the data arrives, not after.

## Scaling

The alert scheduler runs in-process on every instance, and claims each run
window in the database so only one instance sends. Scaling out is therefore safe
— but the claim is what makes it safe, so `scheduled_run_claims` must not be
truncated while the app is running.

## Logs

Every log line carries a request id (`X-Request-Id`, echoed on the response), so
one request can be followed across lines. Errors additionally return an
`errorId` matching the logged stack trace. Log retention is a platform setting;
note that the SCIM provisioning lines record a username, so log retention is
also a personal-data retention decision.
