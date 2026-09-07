CREATE TABLE admin_audit_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_admin_id BIGINT NOT NULL,
    target_type VARCHAR(40) NOT NULL,
    target_id BIGINT NULL,
    action VARCHAR(60) NOT NULL,
    result VARCHAR(30) NOT NULL,
    reason VARCHAR(500) NULL,
    previous_status VARCHAR(30) NULL,
    new_status VARCHAR(30) NULL,
    before_snapshot VARCHAR(1000) NULL,
    after_snapshot VARCHAR(1000) NULL,
    occurred_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT fk_admin_audit_actor FOREIGN KEY (actor_admin_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_admin_audit_occurred ON admin_audit_events(occurred_at, id);
CREATE INDEX idx_admin_audit_actor ON admin_audit_events(actor_admin_id, occurred_at, id);
CREATE INDEX idx_admin_audit_target ON admin_audit_events(target_type, target_id, occurred_at, id);
CREATE INDEX idx_admin_audit_action ON admin_audit_events(action, occurred_at, id);
