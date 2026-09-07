package ma.elearning.engagement;

import org.junit.jupiter.api.Test;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.sql.SQLException;
import static org.junit.jupiter.api.Assertions.assertThrows;

class NotificationMigrationV6Test {
    @Test void migrationRunsOnH2MySqlModeAndEnforcesEventUniqueness() throws Exception {
        try (var connection = DriverManager.getConnection(
                "jdbc:h2:mem:v6check;MODE=MySQL;DATABASE_TO_LOWER=TRUE", "sa", "")) {
            try (var statement = connection.createStatement()) {
                statement.execute("create table users(id bigint auto_increment primary key)");
                statement.execute("create table notifications(id bigint auto_increment primary key, user_id bigint not null, categorie varchar(40) not null)");
                String migration = Files.readString(Path.of("src/main/resources/db/migration/V6__make_notifications_idempotent.sql"));
                for (String sql : migration.split(";")) if (!sql.isBlank()) statement.execute(sql.trim());
                statement.execute("insert into users(id) values (1)");
                statement.execute("insert into notifications(user_id,categorie,event_key) values (1,'CLASSE','session:1')");
                assertThrows(SQLException.class, () -> statement.execute(
                        "insert into notifications(user_id,categorie,event_key) values (1,'CLASSE','session:1')"));
            }
        }
    }
}
