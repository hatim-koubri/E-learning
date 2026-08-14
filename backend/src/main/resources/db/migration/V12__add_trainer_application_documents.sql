CREATE TABLE formateur_justificatifs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    formateur_id BIGINT NOT NULL,
    type_document VARCHAR(20) NOT NULL,
    object_key VARCHAR(500) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT uk_formateur_justificatif_object UNIQUE (object_key),
    CONSTRAINT fk_formateur_justificatif_user FOREIGN KEY (formateur_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_formateur_justificatif_user ON formateur_justificatifs(formateur_id, id);
