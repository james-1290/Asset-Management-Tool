-- V001__initial_schema.sql
-- Full schema for Asset Management Tool (MySQL 8.3)

-- ===================== USERS & RBAC =====================

CREATE TABLE users (
    id CHAR(36) NOT NULL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    theme_preference VARCHAR(50) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE INDEX ix_users_username (username),
    UNIQUE INDEX ix_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE roles (
    id CHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(500) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE permissions (
    id CHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(500) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_roles (
    user_id CHAR(36) NOT NULL,
    role_id CHAR(36) NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE role_permissions (
    role_id CHAR(36) NOT NULL,
    permission_id CHAR(36) NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================== LOCATIONS =====================

CREATE TABLE locations (
    id CHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NULL,
    city VARCHAR(255) NULL,
    country VARCHAR(255) NULL,
    is_archived TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================== PEOPLE =====================

CREATE TABLE people (
    id CHAR(36) NOT NULL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NULL,
    department VARCHAR(255) NULL,
    job_title VARCHAR(255) NULL,
    location_id CHAR(36) NULL,
    is_archived TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_people_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================== ASSET TYPES =====================

CREATE TABLE asset_types (
    id CHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(500) NULL,
    is_archived TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================== ASSETS =====================

CREATE TABLE assets (
    id CHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    asset_tag VARCHAR(255) NOT NULL,
    serial_number VARCHAR(255) NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Available',
    asset_type_id CHAR(36) NOT NULL,
    location_id CHAR(36) NULL,
    assigned_person_id CHAR(36) NULL,
    warranty_expiry_date DATETIME(6) NULL,
    purchase_date DATETIME(6) NULL,
    purchase_cost DECIMAL(18,2) NULL,
    depreciation_months INT NULL,
    sold_date DATETIME(6) NULL,
    sold_price DECIMAL(18,2) NULL,
    retired_date DATETIME(6) NULL,
    notes TEXT NULL,
    is_archived TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE INDEX ix_assets_asset_tag (asset_tag),
    CONSTRAINT fk_assets_asset_type FOREIGN KEY (asset_type_id) REFERENCES asset_types(id),
    CONSTRAINT fk_assets_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
    CONSTRAINT fk_assets_person FOREIGN KEY (assigned_person_id) REFERENCES people(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================== ASSET HISTORY =====================

CREATE TABLE asset_history (
    id CHAR(36) NOT NULL PRIMARY KEY,
    asset_id CHAR(36) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    performed_by_user_id CHAR(36) NULL,
    details TEXT NULL,
    timestamp DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX ix_asset_history_asset_id (asset_id),
    CONSTRAINT fk_asset_history_asset FOREIGN KEY (asset_id) REFERENCES assets(id),
    CONSTRAINT fk_asset_history_user FOREIGN KEY (performed_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE asset_history_changes (
    id CHAR(36) NOT NULL PRIMARY KEY,
    asset_history_id CHAR(36) NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    old_value TEXT NULL,
    new_value TEXT NULL,
    CONSTRAINT fk_asset_history_changes FOREIGN KEY (asset_history_id) REFERENCES asset_history(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================== CERTIFICATE TYPES =====================

CREATE TABLE certificate_types (
    id CHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(500) NULL,
    is_archived TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================== CERTIFICATES =====================

CREATE TABLE certificates (
    id CHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    certificate_type_id CHAR(36) NOT NULL,
    issuer VARCHAR(255) NULL,
    subject VARCHAR(255) NULL,
    thumbprint VARCHAR(255) NULL,
    serial_number VARCHAR(255) NULL,
    issued_date DATETIME(6) NULL,
    expiry_date DATETIME(6) NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    auto_renewal TINYINT(1) NOT NULL DEFAULT 0,
    notes TEXT NULL,
    asset_id CHAR(36) NULL,
    person_id CHAR(36) NULL,
    location_id CHAR(36) NULL,
    is_archived TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_certificates_type FOREIGN KEY (certificate_type_id) REFERENCES certificate_types(id),
    CONSTRAINT fk_certificates_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL,
    CONSTRAINT fk_certificates_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL,
    CONSTRAINT fk_certificates_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================== CERTIFICATE HISTORY =====================

CREATE TABLE certificate_history (
    id CHAR(36) NOT NULL PRIMARY KEY,
    certificate_id CHAR(36) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    performed_by_user_id CHAR(36) NULL,
    details TEXT NULL,
    timestamp DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX ix_certificate_history_cert_id (certificate_id),
    CONSTRAINT fk_certificate_history_cert FOREIGN KEY (certificate_id) REFERENCES certificates(id),
    CONSTRAINT fk_certificate_history_user FOREIGN KEY (performed_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE certificate_history_changes (
    id CHAR(36) NOT NULL PRIMARY KEY,
    certificate_history_id CHAR(36) NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    old_value TEXT NULL,
    new_value TEXT NULL,
    CONSTRAINT fk_cert_history_changes FOREIGN KEY (certificate_history_id) REFERENCES certificate_history(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================== APPLICATION TYPES =====================

CREATE TABLE application_types (
    id CHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(500) NULL,
    is_archived TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================== APPLICATIONS =====================

CREATE TABLE applications (
    id CHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    application_type_id CHAR(36) NOT NULL,
    publisher VARCHAR(255) NULL,
    version VARCHAR(100) NULL,
    licence_key VARCHAR(500) NULL,
    licence_type VARCHAR(50) NULL,
    max_seats INT NULL,
    used_seats INT NULL,
    purchase_date DATETIME(6) NULL,
    expiry_date DATETIME(6) NULL,
    purchase_cost DECIMAL(18,2) NULL,
    auto_renewal TINYINT(1) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    deactivated_date DATETIME(6) NULL,
    notes TEXT NULL,
    asset_id CHAR(36) NULL,
    person_id CHAR(36) NULL,
    location_id CHAR(36) NULL,
    is_archived TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_applications_type FOREIGN KEY (application_type_id) REFERENCES application_types(id),
    CONSTRAINT fk_applications_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL,
    CONSTRAINT fk_applications_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL,
    CONSTRAINT fk_applications_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================== APPLICATION HISTORY =====================

CREATE TABLE application_history (
    id CHAR(36) NOT NULL PRIMARY KEY,
    application_id CHAR(36) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    performed_by_user_id CHAR(36) NULL,
    details TEXT NULL,
    timestamp DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX ix_application_history_app_id (application_id),
    CONSTRAINT fk_application_history_app FOREIGN KEY (application_id) REFERENCES applications(id),
    CONSTRAINT fk_application_history_user FOREIGN KEY (performed_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE application_history_changes (
    id CHAR(36) NOT NULL PRIMARY KEY,
    application_history_id CHAR(36) NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    old_value TEXT NULL,
    new_value TEXT NULL,
    CONSTRAINT fk_app_history_changes FOREIGN KEY (application_history_id) REFERENCES application_history(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================== PERSON HISTORY =====================

CREATE TABLE person_history (
    id CHAR(36) NOT NULL PRIMARY KEY,
    person_id CHAR(36) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    performed_by_user_id CHAR(36) NULL,
    details TEXT NULL,
    timestamp DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX ix_person_history_person_id (person_id),
    CONSTRAINT fk_person_history_person FOREIGN KEY (person_id) REFERENCES people(id),
    CONSTRAINT fk_person_history_user FOREIGN KEY (performed_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE person_history_changes (
    id CHAR(36) NOT NULL PRIMARY KEY,
    person_history_id CHAR(36) NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    old_value TEXT NULL,
    new_value TEXT NULL,
    CONSTRAINT fk_person_history_changes FOREIGN KEY (person_history_id) REFERENCES person_history(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================== AUDIT LOG =====================

CREATE TABLE audit_logs (
    id CHAR(36) NOT NULL PRIMARY KEY,
    actor_id CHAR(36) NULL,
    actor_name VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(255) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    entity_name VARCHAR(255) NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'API',
    details TEXT NULL,
    timestamp DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX ix_audit_logs_timestamp (timestamp),
    INDEX ix_audit_logs_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================== CUSTOM FIELDS =====================

CREATE TABLE custom_field_definitions (
    id CHAR(36) NOT NULL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    asset_type_id CHAR(36) NULL,
    certificate_type_id CHAR(36) NULL,
    application_type_id CHAR(36) NULL,
    name VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    options TEXT NULL,
    is_required TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    is_archived TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_cfd_asset_type FOREIGN KEY (asset_type_id) REFERENCES asset_types(id) ON DELETE CASCADE,
    CONSTRAINT fk_cfd_certificate_type FOREIGN KEY (certificate_type_id) REFERENCES certificate_types(id) ON DELETE CASCADE,
    CONSTRAINT fk_cfd_application_type FOREIGN KEY (application_type_id) REFERENCES application_types(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE custom_field_values (
    id CHAR(36) NOT NULL PRIMARY KEY,
    custom_field_definition_id CHAR(36) NOT NULL,
    entity_id CHAR(36) NOT NULL,
    value TEXT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX ix_cfv_definition_entity (custom_field_definition_id, entity_id),
    CONSTRAINT fk_cfv_definition FOREIGN KEY (custom_field_definition_id) REFERENCES custom_field_definitions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================== SAVED VIEWS =====================

CREATE TABLE saved_views (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    entity_type VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    configuration TEXT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX ix_saved_views_user_entity (user_id, entity_type),
    CONSTRAINT fk_saved_views_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================== SYSTEM SETTINGS =====================

CREATE TABLE system_settings (
    `key` VARCHAR(255) NOT NULL PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_by VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
