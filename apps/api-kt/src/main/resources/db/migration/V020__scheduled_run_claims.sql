-- One instance per scheduled run.
--
-- The alert scheduler runs in-process on every instance. On a single instance
-- that is fine; on Azure App Service scaled to two or more, each instance fires
-- its own run at the same moment and everyone receives duplicate alert emails —
-- silently, and worse the more the app is scaled.
--
-- Before running, an instance inserts a row keyed by (job, run window). The
-- unique key means exactly one insert wins and the rest stand down. Rows are
-- pruned by the same job, so the table stays small.

CREATE TABLE scheduled_run_claims (
    id          CHAR(36)     NOT NULL PRIMARY KEY,
    job_name    VARCHAR(100) NOT NULL,
    run_key     VARCHAR(40)  NOT NULL,
    claimed_at  DATETIME(6)  NOT NULL,
    claimed_by  VARCHAR(100) NULL,
    CONSTRAINT uq_scheduled_run UNIQUE (job_name, run_key)
);

CREATE INDEX idx_scheduled_run_claims_claimed_at ON scheduled_run_claims (claimed_at);
