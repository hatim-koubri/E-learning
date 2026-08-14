CREATE TABLE object_cleanup_tasks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    object_key VARCHAR(512) NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    tentatives INT NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_error VARCHAR(120) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    CONSTRAINT uk_object_cleanup_key UNIQUE (object_key)
);

CREATE INDEX idx_object_cleanup_due ON object_cleanup_tasks(statut, next_attempt_at);

ALTER TABLE seances_virtuelles
    ADD COLUMN version_metier INT NOT NULL DEFAULT 0;
