-- Add indexes for common query patterns not already covered by existing FK indexes

-- Audit log - actor_id for filtering by user
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);

-- Custom field values - entity_id for lookups
CREATE INDEX idx_cfv_entity_id ON custom_field_values(entity_id);

-- User roles - user_id for lookups (role_id already indexed via FK)
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
