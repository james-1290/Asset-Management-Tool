-- Make asset_tag nullable (keep column for existing data)
ALTER TABLE assets MODIFY COLUMN asset_tag VARCHAR(255) NULL;

-- Drop unique index on asset_tag
DROP INDEX ix_assets_asset_tag ON assets;

-- Add name_template to asset_types
ALTER TABLE asset_types ADD COLUMN name_template VARCHAR(500) NULL;
