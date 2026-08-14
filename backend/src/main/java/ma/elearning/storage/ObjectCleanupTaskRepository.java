package ma.elearning.storage;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.*;

public interface ObjectCleanupTaskRepository extends JpaRepository<ObjectCleanupTask,Long>{
    Optional<ObjectCleanupTask> findByObjectKey(String key);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select t from ObjectCleanupTask t where t.id=:id")
    Optional<ObjectCleanupTask> findLockedById(@Param("id") Long id);
    @Query("select t.id from ObjectCleanupTask t where t.statut in ('PENDING','RETRY') and t.nextAttemptAt<=:now order by t.id")
    List<Long> findDueIds(@Param("now") Instant now, Pageable pageable);
}
