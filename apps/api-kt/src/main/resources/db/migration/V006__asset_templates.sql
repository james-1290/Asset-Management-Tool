-- V006__asset_templates.sql
-- Asset templates: saved presets for quickly creating assets with pre-filled fields

CREATE TABLE asset_templates (
    id CHAR(36) NOT NULL PRIMARY KEY,
    asset_type_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    purchase_cost DECIMAL(18, 2) NULL,
    depreciation_months INT NULL,
    location_id CHAR(36) NULL,
    notes TEXT NULL,
    is_archived TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_asset_templates_type FOREIGN KEY (asset_type_id) REFERENCES asset_types(id),
    CONSTRAINT fk_asset_templates_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX ix_asset_templates_type ON asset_templates(asset_type_id);
