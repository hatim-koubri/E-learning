ALTER TABLE users
    ADD COLUMN specialite VARCHAR(160) NULL,
    ADD COLUMN biographie TEXT NULL;

ALTER TABLE questions
    ADD COLUMN explication TEXT NULL;

CREATE TABLE participant_preferences (
    participant_id BIGINT PRIMARY KEY,
    domaines VARCHAR(600) NOT NULL DEFAULT '',
    niveau VARCHAR(20) NOT NULL DEFAULT 'DEBUTANT',
    objectif VARCHAR(300) NOT NULL DEFAULT '',
    minutes_hebdomadaires INT NOT NULL DEFAULT 60,
    format_prefere VARCHAR(30) NOT NULL DEFAULT 'PRATIQUE',
    rappels_actifs BOOLEAN NOT NULL DEFAULT FALSE,
    onboarding_termine BOOLEAN NOT NULL DEFAULT FALSE,
    onboarding_ignore BOOLEAN NOT NULL DEFAULT FALSE,
    fuseau_horaire VARCHAR(60) NOT NULL DEFAULT 'Africa/Casablanca',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_preferences_participant FOREIGN KEY (participant_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_preferences_minutes CHECK (minutes_hebdomadaires BETWEEN 30 AND 180)
);

CREATE TABLE favoris_formations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    participant_id BIGINT NOT NULL,
    formation_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_favoris_participant FOREIGN KEY (participant_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_favoris_formation FOREIGN KEY (formation_id) REFERENCES formations(id) ON DELETE CASCADE,
    CONSTRAINT uk_favoris_participant_formation UNIQUE (participant_id, formation_id)
);

CREATE TABLE positions_apprentissage (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    participant_id BIGINT NOT NULL,
    formation_id BIGINT NOT NULL,
    module_id BIGINT NULL,
    chapitre_id BIGINT NULL,
    ressource_id BIGINT NULL,
    consulted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_positions_participant FOREIGN KEY (participant_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_positions_formation FOREIGN KEY (formation_id) REFERENCES formations(id) ON DELETE CASCADE,
    CONSTRAINT fk_positions_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE SET NULL,
    CONSTRAINT fk_positions_chapitre FOREIGN KEY (chapitre_id) REFERENCES chapitres(id) ON DELETE SET NULL,
    CONSTRAINT fk_positions_ressource FOREIGN KEY (ressource_id) REFERENCES ressources_pedagogiques(id) ON DELETE SET NULL,
    CONSTRAINT uk_positions_participant_formation UNIQUE (participant_id, formation_id)
);

CREATE TABLE notes_privees (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    participant_id BIGINT NOT NULL,
    formation_id BIGINT NOT NULL,
    chapitre_id BIGINT NULL,
    ressource_id BIGINT NULL,
    contenu TEXT NULL,
    signet BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_notes_participant FOREIGN KEY (participant_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notes_formation FOREIGN KEY (formation_id) REFERENCES formations(id) ON DELETE CASCADE,
    CONSTRAINT fk_notes_chapitre FOREIGN KEY (chapitre_id) REFERENCES chapitres(id) ON DELETE CASCADE,
    CONSTRAINT fk_notes_ressource FOREIGN KEY (ressource_id) REFERENCES ressources_pedagogiques(id) ON DELETE CASCADE,
    CONSTRAINT chk_notes_contenu_ou_signet CHECK (contenu IS NOT NULL OR signet = TRUE)
);

CREATE TABLE activites_apprentissage (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    participant_id BIGINT NOT NULL,
    formation_id BIGINT NULL,
    type_activite VARCHAR(30) NOT NULL,
    minutes_validees INT NOT NULL DEFAULT 0,
    source_key VARCHAR(160) NOT NULL,
    occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activites_participant FOREIGN KEY (participant_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_activites_formation FOREIGN KEY (formation_id) REFERENCES formations(id) ON DELETE SET NULL,
    CONSTRAINT uk_activites_source UNIQUE (participant_id, type_activite, source_key),
    CONSTRAINT chk_activites_minutes CHECK (minutes_validees BETWEEN 0 AND 240)
);

CREATE TABLE objectifs_hebdomadaires (
    participant_id BIGINT PRIMARY KEY,
    minutes_cible INT NOT NULL DEFAULT 60,
    fuseau_horaire VARCHAR(60) NOT NULL DEFAULT 'Africa/Casablanca',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_objectifs_participant FOREIGN KEY (participant_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_objectifs_minutes CHECK (minutes_cible IN (30, 60, 120, 180))
);

CREATE TABLE avis_formations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    participant_id BIGINT NOT NULL,
    formation_id BIGINT NOT NULL,
    note TINYINT NOT NULL,
    commentaire VARCHAR(2000) NOT NULL,
    statut_moderation VARCHAR(20) NOT NULL DEFAULT 'PUBLIE',
    reponse_formateur VARCHAR(2000) NULL,
    responded_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_avis_participant FOREIGN KEY (participant_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_avis_formation FOREIGN KEY (formation_id) REFERENCES formations(id) ON DELETE CASCADE,
    CONSTRAINT uk_avis_participant_formation UNIQUE (participant_id, formation_id),
    CONSTRAINT chk_avis_note CHECK (note BETWEEN 1 AND 5)
);

CREATE TABLE signalements_avis (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    avis_id BIGINT NOT NULL,
    participant_id BIGINT NOT NULL,
    motif VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_signalements_avis FOREIGN KEY (avis_id) REFERENCES avis_formations(id) ON DELETE CASCADE,
    CONSTRAINT fk_signalements_participant FOREIGN KEY (participant_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_signalements_participant_avis UNIQUE (participant_id, avis_id)
);

CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    categorie VARCHAR(40) NOT NULL,
    titre VARCHAR(180) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    action_url VARCHAR(500) NULL,
    lue BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE preferences_notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    categorie VARCHAR(40) NOT NULL,
    dans_application BOOLEAN NOT NULL DEFAULT TRUE,
    email_actif BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_preferences_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_preferences_notifications_user_categorie UNIQUE (user_id, categorie)
);

CREATE INDEX idx_favoris_formation ON favoris_formations(formation_id);
CREATE INDEX idx_positions_recentes ON positions_apprentissage(participant_id, consulted_at);
CREATE INDEX idx_notes_participant_updated ON notes_privees(participant_id, updated_at);
CREATE INDEX idx_activites_semaine ON activites_apprentissage(participant_id, occurred_at);
CREATE INDEX idx_avis_formation_statut ON avis_formations(formation_id, statut_moderation);
CREATE INDEX idx_signalements_created ON signalements_avis(created_at);
CREATE INDEX idx_notifications_user_lue ON notifications(user_id, lue, created_at);
