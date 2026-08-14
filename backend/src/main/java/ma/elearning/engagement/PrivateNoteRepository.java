package ma.elearning.engagement;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PrivateNoteRepository extends JpaRepository<PrivateNote, Long> {
    long deleteByParticipantId(Long participantId);
    Optional<PrivateNote> findByIdAndParticipantEmail(Long id, String email);
    @EntityGraph(attributePaths = {"formation", "chapitre", "ressource"})
    List<PrivateNote> findByParticipantEmailOrderByUpdatedAtDesc(String email);
    @EntityGraph(attributePaths = {"formation", "chapitre", "ressource"})
    List<PrivateNote> findByParticipantEmailAndFormationIdOrderByUpdatedAtDesc(String email, Long formationId);
    @Query("""
            select n from PrivateNote n
            where lower(n.participant.email)=lower(:email) and n.formation.id=:formationId and n.signet=true
              and ((:chapterId is null and n.chapitre is null) or n.chapitre.id=:chapterId)
              and ((:resourceId is null and n.ressource is null) or n.ressource.id=:resourceId)
            order by n.id
            """)
    List<PrivateNote> findBookmarksForTarget(@Param("email") String email,
                                              @Param("formationId") Long formationId,
                                              @Param("chapterId") Long chapterId,
                                              @Param("resourceId") Long resourceId);
}
