package ma.elearning.engagement;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;

import static org.junit.jupiter.api.Assertions.*;

class AdminModerationMigrationV9Test {
    @Test
    void migrationPreservesPendingReportsAndClassifiesProvableLegacyDecisions() throws Exception {
        try (var connection = DriverManager.getConnection(
                "jdbc:h2:mem:v9check;MODE=MySQL;DATABASE_TO_LOWER=TRUE", "sa", "")) {
            try (var statement = connection.createStatement()) {
                statement.execute("create table users(id bigint auto_increment primary key)");
                statement.execute("create table avis_formations(id bigint auto_increment primary key," +
                        "statut_moderation varchar(20) not null,updated_at timestamp null)");
                statement.execute("create table signalements_avis(id bigint auto_increment primary key," +
                        "avis_id bigint not null,participant_id bigint not null,motif varchar(500) not null," +
                        "created_at timestamp not null default current_timestamp)");
                statement.execute("insert into users(id) values(1),(2)");
                statement.execute("insert into avis_formations(id,statut_moderation,updated_at) values" +
                        "(10,'SIGNALE',null),(11,'PUBLIE','2026-08-01 10:00:00')," +
                        "(12,'MASQUE','2026-08-02 10:00:00')");
                statement.execute("insert into signalements_avis(id,avis_id,participant_id,motif) values" +
                        "(20,10,2,'pending'),(21,11,2,'republished'),(22,12,2,'hidden')");

                executeMigration(statement, "V9__persist_review_report_resolutions.sql");

                try (var result = statement.executeQuery("select id,statut_traitement," +
                        "decision_moderation,decided_at,decision_admin_id from signalements_avis order by id")) {
                    assertTrue(result.next());
                    assertEquals("EN_ATTENTE", result.getString("statut_traitement"));
                    assertNull(result.getString("decision_moderation"));
                    assertNull(result.getTimestamp("decided_at"));
                    assertNull(result.getObject("decision_admin_id"));
                    assertTrue(result.next());
                    assertEquals("TRAITE_AVIS_REPUBLIE", result.getString("statut_traitement"));
                    assertEquals("REPUBLIER", result.getString("decision_moderation"));
                    assertNotNull(result.getTimestamp("decided_at"));
                    assertNull(result.getObject("decision_admin_id"));
                    assertTrue(result.next());
                    assertEquals("TRAITE_AVIS_MASQUE", result.getString("statut_traitement"));
                    assertEquals("MASQUER", result.getString("decision_moderation"));
                    assertNotNull(result.getTimestamp("decided_at"));
                    assertNull(result.getObject("decision_admin_id"));
                }
            }
        }
    }

    @Test
    void flywayUpgradeFromVersionEightReachesVersionNineInH2MySqlMode() throws Exception {
        String url = "jdbc:h2:mem:flyway-v8-to-v9;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1";
        try (var connection = DriverManager.getConnection(url, "sa", "");
             var statement = connection.createStatement()) {
            statement.execute("create table users(id bigint auto_increment primary key)");
            statement.execute("create table avis_formations(id bigint auto_increment primary key," +
                    "statut_moderation varchar(20) not null,updated_at timestamp null)");
            statement.execute("create table signalements_avis(id bigint auto_increment primary key," +
                    "avis_id bigint not null,participant_id bigint not null,motif varchar(500) not null," +
                    "created_at timestamp not null default current_timestamp)");
        }
        Flyway flyway = Flyway.configure().dataSource(url, "sa", "")
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .baselineVersion(MigrationVersion.fromVersion("8"))
                .target(MigrationVersion.fromVersion("9"))
                .load();

        var result = flyway.migrate();

        assertEquals("9", result.targetSchemaVersion);
        assertEquals(1, result.migrationsExecuted);
        assertEquals("9", flyway.info().current().getVersion().getVersion());
    }

    private void executeMigration(java.sql.Statement statement, String name) throws Exception {
        String migration = Files.readString(Path.of("src/main/resources/db/migration", name));
        for (String sql : migration.split(";")) if (!sql.isBlank()) statement.execute(sql.trim());
    }
}
