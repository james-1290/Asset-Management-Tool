-- Add SAML/SCIM SSO columns to users table
ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL';
ALTER TABLE users ADD COLUMN external_id VARCHAR(255) NULL;
ALTER TABLE users ADD UNIQUE INDEX ix_users_external_id (external_id);
ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL;
