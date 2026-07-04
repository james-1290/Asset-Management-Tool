-- V015__unique_constraints.sql
-- Enforce uniqueness on reference-data names and on custom field values.
-- Each block first disambiguates/removes any pre-existing duplicates so the
-- constraint can be added safely on databases that predate it.

-- Helper pattern: rename all-but-the-first row within each duplicate name group.

-- roles.name
UPDATE roles r JOIN (
  SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY id) rn FROM roles) t WHERE rn > 1
) d ON r.id = d.id SET r.name = CONCAT(r.name, ' (', SUBSTRING(r.id, 1, 8), ')');
ALTER TABLE roles ADD CONSTRAINT uq_roles_name UNIQUE (name);

-- permissions.name
UPDATE permissions p JOIN (
  SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY id) rn FROM permissions) t WHERE rn > 1
) d ON p.id = d.id SET p.name = CONCAT(p.name, ' (', SUBSTRING(p.id, 1, 8), ')');
ALTER TABLE permissions ADD CONSTRAINT uq_permissions_name UNIQUE (name);

-- asset_types.name
UPDATE asset_types a JOIN (
  SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY id) rn FROM asset_types) t WHERE rn > 1
) d ON a.id = d.id SET a.name = CONCAT(a.name, ' (', SUBSTRING(a.id, 1, 8), ')');
ALTER TABLE asset_types ADD CONSTRAINT uq_asset_types_name UNIQUE (name);

-- certificate_types.name
UPDATE certificate_types c JOIN (
  SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY id) rn FROM certificate_types) t WHERE rn > 1
) d ON c.id = d.id SET c.name = CONCAT(c.name, ' (', SUBSTRING(c.id, 1, 8), ')');
ALTER TABLE certificate_types ADD CONSTRAINT uq_certificate_types_name UNIQUE (name);

-- application_types.name
UPDATE application_types a JOIN (
  SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY id) rn FROM application_types) t WHERE rn > 1
) d ON a.id = d.id SET a.name = CONCAT(a.name, ' (', SUBSTRING(a.id, 1, 8), ')');
ALTER TABLE application_types ADD CONSTRAINT uq_application_types_name UNIQUE (name);

-- asset_models (asset_type_id, name)
UPDATE asset_models m JOIN (
  SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY asset_type_id, name ORDER BY id) rn FROM asset_models) t WHERE rn > 1
) d ON m.id = d.id SET m.name = CONCAT(m.name, ' (', SUBSTRING(m.id, 1, 8), ')');
ALTER TABLE asset_models ADD CONSTRAINT uq_asset_models_type_name UNIQUE (asset_type_id, name);

-- custom_field_values: at most one value per (definition, entity). Delete redundant
-- duplicate rows (keep the lowest id), then enforce the constraint.
DELETE cfv FROM custom_field_values cfv JOIN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY custom_field_definition_id, entity_id ORDER BY id) rn
    FROM custom_field_values
  ) t WHERE rn > 1
) d ON cfv.id = d.id;
ALTER TABLE custom_field_values ADD CONSTRAINT uq_cfv_definition_entity UNIQUE (custom_field_definition_id, entity_id);
