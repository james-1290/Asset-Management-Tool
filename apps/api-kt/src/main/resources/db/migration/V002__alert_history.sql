-- Alert history for tracking sent email alerts (deduplication)
CREATE TABLE alert_history (
    id CHAR(36) NOT NULL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id CHAR(36) NOT NULL,
    entity_name VARCHAR(255) NOT NULL,
    threshold_days INT NOT NULL,
    expiry_date DATETIME(6) NOT NULL,
    sent_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    run_id CHAR(36) NOT NULL,
    recipients TEXT NOT NULL,
    INDEX idx_alert_history_dedup (entity_type, entity_id, threshold_days),
    INDEX idx_alert_history_sent_at (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
