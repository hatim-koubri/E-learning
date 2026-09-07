ALTER TABLE quiz
    ADD COLUMN chapitre_id BIGINT NULL AFTER formation_id,
    ADD CONSTRAINT fk_quiz_chapitre FOREIGN KEY (chapitre_id) REFERENCES chapitres(id) ON DELETE CASCADE,
    ADD CONSTRAINT uk_quiz_chapitre UNIQUE (chapitre_id);

CREATE INDEX idx_quiz_chapitre ON quiz(chapitre_id);
