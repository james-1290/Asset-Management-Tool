-- Store business date-only fields as DATE (was DATETIME), so they carry no
-- time-of-day and no timezone, eliminating off-by-one day shifts on display and
-- in expiry/day-count calculations. MySQL MODIFY ... DATE truncates the existing
-- DATETIME to its (UTC) date part and preserves indexes on the column.
-- True timestamps (created_at/updated_at, audit/history timestamps,
-- token_invalidated_at) intentionally stay DATETIME.

ALTER TABLE assets
    MODIFY COLUMN purchase_date DATE NULL,
    MODIFY COLUMN warranty_expiry_date DATE NULL,
    MODIFY COLUMN sold_date DATE NULL,
    MODIFY COLUMN retired_date DATE NULL;

ALTER TABLE certificates
    MODIFY COLUMN issued_date DATE NULL,
    MODIFY COLUMN expiry_date DATE NULL;

ALTER TABLE applications
    MODIFY COLUMN purchase_date DATE NULL,
    MODIFY COLUMN expiry_date DATE NULL,
    MODIFY COLUMN deactivated_date DATE NULL;

ALTER TABLE alert_history
    MODIFY COLUMN expiry_date DATE NOT NULL;

ALTER TABLE user_notifications
    MODIFY COLUMN expiry_date DATE NOT NULL;
