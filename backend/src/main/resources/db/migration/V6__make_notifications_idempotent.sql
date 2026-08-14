ALTER TABLE notifications
    ADD COLUMN event_key VARCHAR(190) NULL;

CREATE UNIQUE INDEX uk_notifications_user_category_event
    ON notifications(user_id, categorie, event_key);

CREATE TABLE notification_deliveries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    categorie VARCHAR(40) NOT NULL,
    event_key VARCHAR(190) NOT NULL,
    canal VARCHAR(20) NOT NULL,
    statut VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_deliveries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_notification_deliveries_event UNIQUE (user_id, categorie, event_key, canal)
);
