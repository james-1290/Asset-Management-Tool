-- Composite indexes for list pages, which always filter by is_archived and then
-- sort by the entity's default column. The single-column is_archived indexes
-- from V011 can't serve the ORDER BY, so those queries filter via the index but
-- filesort the result. A leading-is_archived composite lets one index satisfy
-- both filter and sort. InnoDB appends the PK to every secondary index, so e.g.
-- (is_archived, name) also orders by (name, id) — matching the id tiebreak now
-- applied to every list sort.

CREATE INDEX idx_assets_archived_name        ON assets(is_archived, name);
CREATE INDEX idx_assets_archived_created      ON assets(is_archived, created_at);

CREATE INDEX idx_certificates_archived_name   ON certificates(is_archived, name);

CREATE INDEX idx_applications_archived_name   ON applications(is_archived, name);

CREATE INDEX idx_people_archived_fullname     ON people(is_archived, full_name);
CREATE INDEX idx_people_archived_department   ON people(is_archived, department);

CREATE INDEX idx_locations_archived_name      ON locations(is_archived, name);
