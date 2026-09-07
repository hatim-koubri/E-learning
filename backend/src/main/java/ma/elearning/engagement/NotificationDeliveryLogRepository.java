package ma.elearning.engagement;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NotificationDeliveryLogRepository extends JpaRepository<NotificationDeliveryLog, Long> {
    long deleteByUserId(Long userId);
    boolean existsByUserIdAndCategorieAndEventKeyAndCanal(
            Long userId, NotificationCategory category, String eventKey, String channel);
    long countByUserIdAndCategorieAndEventKeyAndCanal(
            Long userId, NotificationCategory category, String eventKey, String channel);
    Optional<NotificationDeliveryLog> findByUserIdAndCategorieAndEventKeyAndCanal(
            Long userId, NotificationCategory category, String eventKey, String channel);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select delivery from NotificationDeliveryLog delivery where delivery.id=:id")
    Optional<NotificationDeliveryLog> findLockedById(@Param("id") Long id);
    @Query("select delivery.id from NotificationDeliveryLog delivery " +
            "where delivery.statut in :statuses and delivery.nextAttemptAt<=:now order by delivery.id")
    List<Long> findDueIds(@Param("statuses") Collection<EmailDeliveryStatus> statuses,
                          @Param("now") Instant now, Pageable pageable);
}
