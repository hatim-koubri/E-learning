package ma.elearning.admin;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;

public interface AdminAuditEventRepository extends JpaRepository<AdminAuditEvent, Long> {
    @Query("""
            select e from AdminAuditEvent e
            where (:actorId is null or e.actor.id = :actorId)
              and (:targetId is null or e.targetId = :targetId)
              and (:action is null or e.action = :action)
              and (:fromDate is null or e.occurredAt >= :fromDate)
              and (:toDate is null or e.occurredAt < :toDate)
            """)
    Page<AdminAuditEvent> search(@Param("actorId") Long actorId, @Param("targetId") Long targetId,
                                 @Param("action") String action, @Param("fromDate") Instant fromDate,
                                 @Param("toDate") Instant toDate, Pageable pageable);
}
