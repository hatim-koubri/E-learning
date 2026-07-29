CREATE TABLE inscriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    participant_id BIGINT NOT NULL,
    formation_id BIGINT NOT NULL,
    date_inscription TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    statut VARCHAR(20) NOT NULL,
    type_acces VARCHAR(30) NOT NULL,
    progression DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    prix_paye DECIMAL(10,2) NOT NULL,
    devise VARCHAR(3) NOT NULL DEFAULT 'DH',
    mode_paiement VARCHAR(20) NOT NULL DEFAULT 'SIMULATION',
    CONSTRAINT fk_inscriptions_participant FOREIGN KEY (participant_id) REFERENCES users(id),
    CONSTRAINT fk_inscriptions_formation FOREIGN KEY (formation_id) REFERENCES formations(id),
    CONSTRAINT uk_inscriptions_participant_formation UNIQUE (participant_id, formation_id),
    CONSTRAINT chk_inscriptions_progression CHECK (progression BETWEEN 0 AND 100),
    CONSTRAINT chk_inscriptions_prix CHECK (prix_paye >= 0)
);

CREATE TABLE progressions_chapitres (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    inscription_id BIGINT NOT NULL,
    chapitre_id BIGINT NOT NULL,
    termine BOOLEAN NOT NULL DEFAULT FALSE,
    position_video_secondes INT NOT NULL DEFAULT 0,
    termine_le TIMESTAMP NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_progressions_inscription FOREIGN KEY (inscription_id) REFERENCES inscriptions(id) ON DELETE CASCADE,
    CONSTRAINT fk_progressions_chapitre FOREIGN KEY (chapitre_id) REFERENCES chapitres(id) ON DELETE CASCADE,
    CONSTRAINT uk_progressions_inscription_chapitre UNIQUE (inscription_id, chapitre_id),
    CONSTRAINT chk_progressions_position_video CHECK (position_video_secondes >= 0)
);

CREATE TABLE quiz (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    formation_id BIGINT NOT NULL,
    titre VARCHAR(180) NOT NULL,
    ordre INT NOT NULL,
    score_minimal DECIMAL(5,2) NOT NULL,
    important BOOLEAN NOT NULL DEFAULT FALSE,
    publie BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_quiz_formation FOREIGN KEY (formation_id) REFERENCES formations(id) ON DELETE CASCADE,
    CONSTRAINT uk_quiz_formation_ordre UNIQUE (formation_id, ordre),
    CONSTRAINT chk_quiz_ordre CHECK (ordre >= 0),
    CONSTRAINT chk_quiz_score_minimal CHECK (score_minimal BETWEEN 0 AND 100)
);

CREATE TABLE questions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quiz_id BIGINT NOT NULL,
    libelle TEXT NOT NULL,
    ordre INT NOT NULL,
    points DECIMAL(6,2) NOT NULL DEFAULT 1.00,
    CONSTRAINT fk_questions_quiz FOREIGN KEY (quiz_id) REFERENCES quiz(id) ON DELETE CASCADE,
    CONSTRAINT uk_questions_quiz_ordre UNIQUE (quiz_id, ordre),
    CONSTRAINT chk_questions_ordre CHECK (ordre >= 0),
    CONSTRAINT chk_questions_points CHECK (points > 0)
);

CREATE TABLE reponses_proposees (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    question_id BIGINT NOT NULL,
    libelle VARCHAR(1000) NOT NULL,
    correcte BOOLEAN NOT NULL DEFAULT FALSE,
    ordre INT NOT NULL,
    CONSTRAINT fk_reponses_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    CONSTRAINT uk_reponses_question_ordre UNIQUE (question_id, ordre),
    CONSTRAINT chk_reponses_ordre CHECK (ordre >= 0)
);

CREATE TABLE tentatives_quiz (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quiz_id BIGINT NOT NULL,
    inscription_id BIGINT NOT NULL,
    date_passage TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_soumission TIMESTAMP NULL,
    statut VARCHAR(20) NOT NULL,
    score DECIMAL(6,2) NULL,
    score_maximal DECIMAL(6,2) NULL,
    reussi BOOLEAN NULL,
    CONSTRAINT fk_tentatives_quiz FOREIGN KEY (quiz_id) REFERENCES quiz(id),
    CONSTRAINT fk_tentatives_inscription FOREIGN KEY (inscription_id) REFERENCES inscriptions(id),
    CONSTRAINT uk_tentatives_id_quiz UNIQUE (id, quiz_id)
);

CREATE TABLE reponses_tentatives (
    tentative_id BIGINT NOT NULL,
    question_id BIGINT NOT NULL,
    reponse_id BIGINT NOT NULL,
    PRIMARY KEY (tentative_id, question_id, reponse_id),
    CONSTRAINT fk_rt_tentative FOREIGN KEY (tentative_id) REFERENCES tentatives_quiz(id) ON DELETE CASCADE,
    CONSTRAINT fk_rt_question FOREIGN KEY (question_id) REFERENCES questions(id),
    CONSTRAINT fk_rt_reponse FOREIGN KEY (reponse_id) REFERENCES reponses_proposees(id)
);

CREATE INDEX idx_inscriptions_formation ON inscriptions(formation_id);
CREATE INDEX idx_progressions_chapitre ON progressions_chapitres(chapitre_id);
CREATE INDEX idx_tentatives_limite ON tentatives_quiz(inscription_id, quiz_id, date_passage);
