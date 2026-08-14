package ma.elearning.admin;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;

import java.sql.DriverManager;

import static org.junit.jupiter.api.Assertions.*;

class AdminLifecycleMigrationTest {
    @Test void upgradeFromNineCreatesLifecycleAndImmutableAuditSchema() throws Exception {
        String url="jdbc:h2:mem:flyway-v9-to-v11;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1";
        try(var connection=DriverManager.getConnection(url,"sa","");var statement=connection.createStatement()){
            statement.execute("create table users(id bigint auto_increment primary key, role varchar(20) not null, statut varchar(20) not null, created_at timestamp not null)");
        }
        Flyway flyway=Flyway.configure().dataSource(url,"sa","").locations("classpath:db/migration")
                .baselineOnMigrate(true).baselineVersion(MigrationVersion.fromVersion("9"))
                .target(MigrationVersion.fromVersion("11")).load();
        var result=flyway.migrate();
        assertEquals("11",result.targetSchemaVersion);assertEquals(2,result.migrationsExecuted);
        try(var connection=DriverManager.getConnection(url,"sa","");var columns=connection.getMetaData().getColumns(null,null,"users","lifecycle_version")){
            assertTrue(columns.next());
        }
        try(var connection=DriverManager.getConnection(url,"sa","");var tables=connection.getMetaData().getTables(null,null,"admin_audit_events",null)){
            assertTrue(tables.next());
        }
    }
}
