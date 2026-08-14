package ma.elearning.engagement;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ParticipantPreferenceRepository extends JpaRepository<ParticipantPreference, Long> {
    long deleteByParticipantId(Long participantId);
    Optional<ParticipantPreference> findByParticipantEmail(String email);
}
