ALTER TABLE users ADD COLUMN suspension_reason VARCHAR(500) NULL;
ALTER TABLE users ADD COLUMN suspended_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN suspension_admin_id BIGINT NULL;
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN anonymized_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN lifecycle_version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE users
    ADD CONSTRAINT fk_users_suspension_admin
        FOREIGN KEY (suspension_admin_id) REFERENCES users(id) ON DELETE RESTRICT;

CREATE INDEX idx_users_role_status_created ON users(role, statut, created_at, id);
CREATE INDEX idx_users_status_created ON users(statut, created_at, id);
