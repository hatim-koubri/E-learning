package ma.elearning.engagement;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, Long> {
    List<NotificationPreference> findByUserEmailOrderByCategorie(String email);
    Optional<NotificationPreference> findByUserEmailAndCategorie(String email, NotificationCategory category);
}
