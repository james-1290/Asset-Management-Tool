-- User notifications (per-user notification with read/dismiss/snooze state)
CREATE TABLE user_notifications (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id CHAR(36) NOT NULL,
    entity_name VARCHAR(255) NOT NULL,
    notification_type VARCHAR(20) NOT NULL DEFAULT 'global',
    title VARCHAR(255) NOT NULL,
    message VARCHAR(500) NOT NULL DEFAULT '',
    threshold_days INT NOT NULL,
    expiry_date DATETIME(6) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at DATETIME(6) NULL,
    is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    dismissed_at DATETIME(6) NULL,
    snoozed_until DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_user_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_notif_user_read (user_id, is_read, is_dismissed),
    INDEX idx_user_notif_user_created (user_id, created_at),
    INDEX idx_user_notif_dedup (entity_type, entity_id, user_id, threshold_days)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Personal alert rules (user-created alert configurations)
CREATE TABLE user_alert_rules (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    entity_types VARCHAR(255) NOT NULL,
    thresholds VARCHAR(100) NOT NULL DEFAULT '90,30,14,7',
    conditions TEXT NULL,
    notify_email BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_user_alert_rules_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_alert_rules_user (user_id),
    INDEX idx_user_alert_rules_active (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
