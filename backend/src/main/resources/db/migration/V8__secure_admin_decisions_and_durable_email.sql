ALTER TABLE users ADD COLUMN decision_admin_id BIGINT NULL;
ALTER TABLE users ADD COLUMN decision_result VARCHAR(20) NULL;
ALTER TABLE users ADD CONSTRAINT fk_users_decision_admin
    FOREIGN KEY (decision_admin_id) REFERENCES users(id) ON DELETE RESTRICT;
CREATE INDEX idx_users_decision_admin ON users(decision_admin_id);

ALTER TABLE notification_deliveries ADD COLUMN mandatory BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE notification_deliveries ADD COLUMN attempt_count INT NOT NULL DEFAULT 0;
ALTER TABLE notification_deliveries ADD COLUMN next_attempt_at TIMESTAMP NULL;
ALTER TABLE notification_deliveries ADD COLUMN last_attempt_at TIMESTAMP NULL;
ALTER TABLE notification_deliveries ADD COLUMN last_error_code VARCHAR(80) NULL;
ALTER TABLE notification_deliveries ADD COLUMN subject VARCHAR(180) NULL;
ALTER TABLE notification_deliveries ADD COLUMN text_body TEXT NULL;
ALTER TABLE notification_deliveries ADD COLUMN html_body TEXT NULL;
ALTER TABLE notification_deliveries ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

UPDATE notification_deliveries
SET statut = CASE
    WHEN statut = 'ENVOYE' THEN 'SENT'
    WHEN statut = 'DEMANDE' THEN 'FAILED'
    WHEN statut = 'ECHEC' THEN 'FAILED'
    ELSE statut
END;

CREATE INDEX idx_notification_deliveries_due
    ON notification_deliveries(statut, next_attempt_at);
