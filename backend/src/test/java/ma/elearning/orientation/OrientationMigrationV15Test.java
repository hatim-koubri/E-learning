package ma.elearning.orientation;
import org.junit.jupiter.api.Test;
import java.nio.file.*;
import java.sql.DriverManager;
import static org.junit.jupiter.api.Assertions.*;
class OrientationMigrationV15Test {
    @Test void migrationCreatesConstrainedConversationSchemaInH2MySqlMode() throws Exception {try(var connection=DriverManager.getConnection("jdbc:h2:mem:orientation-v15;MODE=MySQL;DATABASE_TO_LOWER=TRUE","sa","");var statement=connection.createStatement()){
        statement.execute("create table users(id bigint auto_increment primary key)");statement.execute("create table formations(id bigint auto_increment primary key)");
        String sql=Files.readString(Path.of("src/main/resources/db/migration/V15__create_orientation_advisor.sql"));for(String part:sql.split(";"))if(!part.isBlank())statement.execute(part.strip());
        statement.execute("insert into orientation_conversations(session_id) values('visitor-session-123456')");try(var rs=statement.executeQuery("select count(*) from orientation_conversations")){assertTrue(rs.next());assertEquals(1,rs.getInt(1));}
        assertThrows(Exception.class,()->statement.execute("insert into orientation_recommendations(conversation_id,formation_id,score,rang,raisons_json) values(1,1,101,1,'[]')"));
    }}
}
