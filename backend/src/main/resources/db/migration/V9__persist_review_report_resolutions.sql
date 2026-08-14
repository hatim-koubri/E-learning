ALTER TABLE signalements_avis
    ADD COLUMN statut_traitement VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE';
ALTER TABLE signalements_avis
    ADD COLUMN decision_moderation VARCHAR(20) NULL;
ALTER TABLE signalements_avis
    ADD COLUMN decided_at TIMESTAMP NULL;
ALTER TABLE signalements_avis
    ADD COLUMN decision_admin_id BIGINT NULL;

ALTER TABLE signalements_avis
    ADD CONSTRAINT fk_signalements_decision_admin
    FOREIGN KEY (decision_admin_id) REFERENCES users(id) ON DELETE SET NULL;

UPDATE signalements_avis report
SET statut_traitement = CASE
        WHEN EXISTS (SELECT 1 FROM avis_formations review
                     WHERE review.id = report.avis_id AND review.statut_moderation = 'PUBLIE')
            THEN 'TRAITE_AVIS_REPUBLIE'
        WHEN EXISTS (SELECT 1 FROM avis_formations review
                     WHERE review.id = report.avis_id AND review.statut_moderation = 'MASQUE')
            THEN 'TRAITE_AVIS_MASQUE'
        ELSE 'EN_ATTENTE'
    END,
    decision_moderation = CASE
        WHEN EXISTS (SELECT 1 FROM avis_formations review
                     WHERE review.id = report.avis_id AND review.statut_moderation = 'PUBLIE')
            THEN 'REPUBLIER'
        WHEN EXISTS (SELECT 1 FROM avis_formations review
                     WHERE review.id = report.avis_id AND review.statut_moderation = 'MASQUE')
            THEN 'MASQUER'
        ELSE NULL
    END,
    decided_at = CASE
        WHEN EXISTS (SELECT 1 FROM avis_formations review
                     WHERE review.id = report.avis_id AND review.statut_moderation IN ('PUBLIE', 'MASQUE'))
            THEN COALESCE((SELECT review.updated_at FROM avis_formations review
                           WHERE review.id = report.avis_id), report.created_at)
        ELSE NULL
    END;

CREATE INDEX idx_signalements_pending_order
    ON signalements_avis(statut_traitement, created_at, id);
CREATE INDEX idx_signalements_review_status
    ON signalements_avis(avis_id, statut_traitement);
