package ma.elearning.storage;

import org.junit.jupiter.api.Test;
import java.nio.file.*;
import java.sql.*;
import static org.junit.jupiter.api.Assertions.*;

class ObjectCleanupMigrationV7Test {
 @Test void migrationCreatesDurableUniqueQueueAndSessionVersion()throws Exception{try(var connection=DriverManager.getConnection("jdbc:h2:mem:v7check;MODE=MySQL;DATABASE_TO_LOWER=TRUE","sa","")){try(var statement=connection.createStatement()){statement.execute("create table seances_virtuelles(id bigint auto_increment primary key)");String migration=Files.readString(Path.of("src/main/resources/db/migration/V7__add_durable_object_cleanup.sql"));for(String sql:migration.split(";"))if(!sql.isBlank())statement.execute(sql.trim());statement.execute("insert into object_cleanup_tasks(object_key) values ('formations/1/a.pdf')");assertThrows(SQLException.class,()->statement.execute("insert into object_cleanup_tasks(object_key) values ('formations/1/a.pdf')"));try(var result=statement.executeQuery("select version_metier from seances_virtuelles")){assertFalse(result.next());}}}}
}
