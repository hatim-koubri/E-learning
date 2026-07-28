CREATE TABLE formations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    formateur_id BIGINT NOT NULL,
    titre VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    image_couverture_key VARCHAR(512),
    langue VARCHAR(10) NOT NULL,
    niveau VARCHAR(20) NOT NULL,
    categorie VARCHAR(120) NOT NULL,
    prix DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    statut VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_formations_formateur FOREIGN KEY (formateur_id) REFERENCES users(id),
    CONSTRAINT chk_formations_prix CHECK (prix >= 0)
);

CREATE TABLE modules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    formation_id BIGINT NOT NULL,
    titre VARCHAR(180) NOT NULL,
    description TEXT,
    position INT NOT NULL,
    apercu_gratuit BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_modules_formation FOREIGN KEY (formation_id) REFERENCES formations(id) ON DELETE CASCADE,
    CONSTRAINT uk_modules_formation_position UNIQUE (formation_id, position),
    CONSTRAINT chk_modules_position CHECK (position >= 0)
);

CREATE TABLE chapitres (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    module_id BIGINT NOT NULL,
    titre VARCHAR(180) NOT NULL,
    description TEXT,
    position INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_chapitres_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    CONSTRAINT uk_chapitres_module_position UNIQUE (module_id, position),
    CONSTRAINT chk_chapitres_position CHECK (position >= 0)
);

CREATE TABLE ressources_pedagogiques (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    chapitre_id BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL,
    titre VARCHAR(180) NOT NULL,
    position INT NOT NULL,
    nom_original VARCHAR(255),
    type_mime VARCHAR(120),
    taille BIGINT,
    cle_stockage VARCHAR(512),
    url_youtube VARCHAR(500),
    telechargeable BOOLEAN NOT NULL DEFAULT FALSE,
    statut VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ressources_chapitre FOREIGN KEY (chapitre_id) REFERENCES chapitres(id) ON DELETE CASCADE,
    CONSTRAINT uk_ressources_chapitre_position UNIQUE (chapitre_id, position),
    CONSTRAINT chk_ressources_position CHECK (position >= 0),
    CONSTRAINT chk_ressources_taille CHECK (taille IS NULL OR taille >= 0),
    CONSTRAINT chk_ressources_source CHECK (
        (type = 'YOUTUBE' AND url_youtube IS NOT NULL AND cle_stockage IS NULL)
        OR
        (type <> 'YOUTUBE' AND cle_stockage IS NOT NULL AND url_youtube IS NULL)
    )
);

CREATE INDEX idx_formations_formateur_updated ON formations(formateur_id, updated_at);
CREATE INDEX idx_chapitres_module ON chapitres(module_id);
CREATE INDEX idx_ressources_chapitre ON ressources_pedagogiques(chapitre_id);
