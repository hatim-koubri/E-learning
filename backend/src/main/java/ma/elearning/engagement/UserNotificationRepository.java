package ma.elearning.engagement;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserNotificationRepository extends JpaRepository<UserNotification, Long> {
    long deleteByUserId(Long userId);
    Page<UserNotification> findByUserEmailOrderByCreatedAtDesc(String email, Pageable pageable);
    Optional<UserNotification> findByIdAndUserEmail(Long id, String email);
    long countByUserEmailAndLueFalse(String email);
    boolean existsByUserIdAndCategorieAndEventKey(Long userId, NotificationCategory category, String eventKey);
    long countByUserIdAndCategorieAndEventKey(Long userId, NotificationCategory category, String eventKey);
    @Modifying
    @Query("update UserNotification n set n.lue = true where n.user.email = :email and n.lue = false")
    int markAllRead(@Param("email") String email);
}
