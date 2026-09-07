package ma.elearning.orientation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface OrientationRecommendationRepository extends JpaRepository<OrientationRecommendation,Long>{
    List<OrientationRecommendation> findByConversationIdOrderByRangAsc(Long id);
    void deleteByConversationId(Long id);
}
