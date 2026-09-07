package ma.elearning.orientation;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import java.time.Instant;
import java.util.*;
public interface OrientationMessageRepository extends JpaRepository<OrientationMessage,Long>{
    List<OrientationMessage> findByConversationIdOrderByCreatedAtAscIdAsc(Long id);
    @Query("select m from OrientationMessage m where m.conversation.id=:id order by m.createdAt desc,m.id desc") List<OrientationMessage> recent(Long id, Pageable pageable);
    Optional<OrientationMessage> findByConversationIdAndRequestId(Long id,String requestId);
    long countByConversationSessionIdAndRoleAndCreatedAtAfter(String session,String role,Instant after);
}
