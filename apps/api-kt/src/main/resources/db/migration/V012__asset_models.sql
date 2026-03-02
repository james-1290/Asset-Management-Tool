-- Create asset_models table
CREATE TABLE asset_models (
    id CHAR(36) NOT NULL PRIMARY KEY,
    asset_type_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255) NULL,
    image_url VARCHAR(500) NULL,
    is_archived TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX ix_asset_models_asset_type_id (asset_type_id),
    CONSTRAINT fk_asset_models_asset_type FOREIGN KEY (asset_type_id) REFERENCES asset_types(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add model reference to assets
ALTER TABLE assets ADD COLUMN asset_model_id CHAR(36) NULL;
ALTER TABLE assets ADD CONSTRAINT fk_assets_asset_model FOREIGN KEY (asset_model_id) REFERENCES asset_models(id) ON DELETE SET NULL;
ALTER TABLE assets ADD INDEX ix_assets_asset_model_id (asset_model_id);
