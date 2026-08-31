-- Optimistic locking for the entities that lacked it.
--
-- Assets, certificates, applications, people and locations already carry a
-- version column, so two people editing the same record get a clear conflict
-- rather than one silently overwriting the other. The type registers, models
-- and templates had no such protection: last write won, with no sign that
-- anything had been lost.
--
-- Existing rows start at 0, which is the value Hibernate assigns to a new
-- entity, so no backfill beyond the default is needed.

ALTER TABLE asset_types        ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE certificate_types  ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE application_types  ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE asset_models       ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE asset_templates    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
