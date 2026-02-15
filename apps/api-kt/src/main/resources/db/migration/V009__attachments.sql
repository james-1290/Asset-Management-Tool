-- V009__attachments.sql
-- Create attachments table for file uploads linked to assets, certificates, and applications

CREATE TABLE attachments (
    id CHAR(36) PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL COMMENT 'Type of entity (Asset, Certificate, Application)',
    entity_id CHAR(36) NOT NULL COMMENT 'ID of the entity this attachment belongs to',
    file_name VARCHAR(500) NOT NULL COMMENT 'Stored filename (UUID-based)',
    original_file_name VARCHAR(500) NOT NULL COMMENT 'User''s original filename',
    file_size BIGINT NOT NULL COMMENT 'File size in bytes',
    mime_type VARCHAR(255) NOT NULL COMMENT 'MIME type of the file',
    storage_key VARCHAR(1000) NOT NULL COMMENT 'Full storage path/key',
    uploaded_by_id CHAR(36) NULL COMMENT 'ID of user who uploaded the file',
    uploaded_by_name VARCHAR(255) NOT NULL COMMENT 'Name of user who uploaded (preserved if user deleted)',
    is_archived TINYINT(1) DEFAULT 0 NOT NULL COMMENT 'Soft delete flag',
    created_at DATETIME(6) NOT NULL COMMENT 'Upload timestamp',

    CONSTRAINT fk_attachments_uploaded_by FOREIGN KEY (uploaded_by_id)
        REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index for efficient entity lookups (most common query pattern)
CREATE INDEX idx_attachments_entity
    ON attachments(entity_type, entity_id, is_archived);

-- Index for sorting/filtering by upload date
CREATE INDEX idx_attachments_created_at
    ON attachments(created_at);
