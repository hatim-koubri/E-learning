package ma.elearning.engagement;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;

import static org.junit.jupiter.api.Assertions.*;

class AdminDurabilityMigrationV8Test {
    @Test
    void migrationRunsOnH2MySqlModeAndAddsDecisionAndRetryColumns() throws Exception {
        try (var connection = DriverManager.getConnection(
                "jdbc:h2:mem:v8check;MODE=MySQL;DATABASE_TO_LOWER=TRUE", "sa", "")) {
            try (var statement = connection.createStatement()) {
                statement.execute("create table users(id bigint auto_increment primary key, date_decision timestamp null)");
                statement.execute("create table notification_deliveries(" +
                        "id bigint auto_increment primary key,user_id bigint not null,categorie varchar(40) not null," +
                        "event_key varchar(190) not null,canal varchar(20) not null,statut varchar(20) not null," +
                        "created_at timestamp not null default current_timestamp)");
                statement.execute("insert into users(id) values (1),(2)");
                statement.execute("insert into notification_deliveries(user_id,categorie,event_key,canal,statut) " +
                        "values (2,'COMPTE_FORMATEUR','decision:2','EMAIL','ECHEC')");
                String migration = Files.readString(Path.of(
                        "src/main/resources/db/migration/V8__secure_admin_decisions_and_durable_email.sql"));
                for (String sql : migration.split(";")) if (!sql.isBlank()) statement.execute(sql.trim());

                statement.execute("update users set decision_admin_id=1,decision_result='REFUSE' where id=2");
                try (var result = statement.executeQuery(
                        "select decision_admin_id,decision_result from users where id=2")) {
                    assertTrue(result.next());
                    assertEquals(1L, result.getLong(1));
                    assertEquals("REFUSE", result.getString(2));
                }
                try (var result = statement.executeQuery(
                        "select statut,attempt_count,mandatory,last_error_code from notification_deliveries")) {
                    assertTrue(result.next());
                    assertEquals("FAILED", result.getString("statut"));
                    assertEquals(0, result.getInt("attempt_count"));
                    assertFalse(result.getBoolean("mandatory"));
                    assertNull(result.getString("last_error_code"));
                }
            }
        }
    }
}
