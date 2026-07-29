ALTER TABLE formations
    ADD COLUMN supplement_classes DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN classes_gratuites BOOLEAN NOT NULL DEFAULT FALSE,
    ADD CONSTRAINT chk_formations_supplement_classes CHECK (supplement_classes >= 0);

CREATE TABLE operations_acces (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    inscription_id BIGINT NOT NULL,
    cle_idempotence VARCHAR(100) NOT NULL,
    montant_simule DECIMAL(10,2) NOT NULL,
    devise VARCHAR(3) NOT NULL DEFAULT 'DH',
    date_operation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    type_acces_obtenu VARCHAR(30) NOT NULL,
    mode_paiement VARCHAR(20) NOT NULL DEFAULT 'SIMULATION',
    statut VARCHAR(20) NOT NULL DEFAULT 'CONFIRME',
    CONSTRAINT fk_operations_inscription FOREIGN KEY (inscription_id) REFERENCES inscriptions(id),
    CONSTRAINT uk_operations_cle UNIQUE (cle_idempotence),
    CONSTRAINT chk_operations_montant CHECK (montant_simule >= 0)
);

CREATE TABLE classes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    formation_id BIGINT NOT NULL,
    nom VARCHAR(180) NOT NULL,
    description TEXT NULL,
    capacite INT NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_classes_formation FOREIGN KEY (formation_id) REFERENCES formations(id),
    CONSTRAINT chk_classes_capacite CHECK (capacite > 0),
    CONSTRAINT chk_classes_dates CHECK (date_fin >= date_debut)
);

CREATE TABLE classe_membres (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    classe_id BIGINT NOT NULL,
    participant_id BIGINT NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'INVITE',
    invited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    joined_at TIMESTAMP NULL,
    CONSTRAINT fk_membres_classe FOREIGN KEY (classe_id) REFERENCES classes(id) ON DELETE CASCADE,
    CONSTRAINT fk_membres_participant FOREIGN KEY (participant_id) REFERENCES users(id),
    CONSTRAINT uk_membres_classe_participant UNIQUE (classe_id, participant_id)
);

CREATE TABLE seances_virtuelles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    classe_id BIGINT NOT NULL,
    titre VARCHAR(180) NOT NULL,
    date_debut TIMESTAMP NOT NULL,
    date_fin TIMESTAMP NOT NULL,
    fuseau_horaire VARCHAR(60) NOT NULL,
    identifiant_salle VARCHAR(100) NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'PLANIFIEE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_seances_classe FOREIGN KEY (classe_id) REFERENCES classes(id) ON DELETE CASCADE,
    CONSTRAINT uk_seances_salle UNIQUE (identifiant_salle),
    CONSTRAINT chk_seances_dates CHECK (date_fin > date_debut)
);

CREATE INDEX idx_classes_formation ON classes(formation_id);
CREATE INDEX idx_membres_participant ON classe_membres(participant_id);
CREATE INDEX idx_seances_classe_date ON seances_virtuelles(classe_id, date_debut);
