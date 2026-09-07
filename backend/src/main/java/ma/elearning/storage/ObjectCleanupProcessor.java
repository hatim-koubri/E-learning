package ma.elearning.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;

@Service
public class ObjectCleanupProcessor {
    private static final Logger log = LoggerFactory.getLogger(ObjectCleanupProcessor.class);
    private static final int MAX_ATTEMPTS = 10;
    private final ObjectCleanupTaskRepository tasks;
    private final ObjectStorage storage;
    private final Clock clock;

    public ObjectCleanupProcessor(ObjectCleanupTaskRepository tasks, ObjectStorage storage, Clock clock) {
        this.tasks = tasks;
        this.storage = storage;
        this.clock = clock;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void process(Long id) {
        ObjectCleanupTask task = tasks.findLockedById(id).orElse(null);
        if (task == null || "SUCCESS".equals(task.getStatut()) || "FAILED".equals(task.getStatut())) return;
        try {
            storage.delete(task.getObjectKey());
            task.setStatut("SUCCESS");
            task.setLastError(null);
            task.setCompletedAt(clock.instant());
        } catch (RuntimeException failure) {
            int attempt = task.getTentatives() + 1;
            task.setTentatives(attempt);
            task.setLastError("STORAGE_UNAVAILABLE");
            if (attempt >= MAX_ATTEMPTS) {
                task.setStatut("FAILED");
                log.error("Nettoyage objet définitivement échoué, taskId={}", task.getId());
            } else {
                task.setStatut("RETRY");
                long delay = Math.min(3600, 30L * (1L << Math.min(attempt - 1, 6)));
                task.setNextAttemptAt(clock.instant().plusSeconds(delay));
                log.warn("Nettoyage objet à réessayer, taskId={}, tentative={}", task.getId(), attempt);
            }
        }
    }
}
