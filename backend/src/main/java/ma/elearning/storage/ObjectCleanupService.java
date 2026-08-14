package ma.elearning.storage;

import org.slf4j.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.*;

@Service
public class ObjectCleanupService {
    private static final Logger log=LoggerFactory.getLogger(ObjectCleanupService.class);
    private static final int MAX_ATTEMPTS=10;
    private final ObjectCleanupTaskRepository tasks; private final ObjectStorage storage; private final Clock clock;
    public ObjectCleanupService(ObjectCleanupTaskRepository tasks,ObjectStorage storage,Clock clock){this.tasks=tasks;this.storage=storage;this.clock=clock;}

    @Transactional public Long enqueue(String key){return create(key);}
    @Transactional(propagation=Propagation.REQUIRES_NEW) public Long enqueueCompensation(String key){return create(key);}
    private Long create(String key){
        ObjectCleanupTask existing=tasks.findByObjectKey(key).orElse(null);if(existing!=null)return existing.getId();
        ObjectCleanupTask task=new ObjectCleanupTask();task.setObjectKey(key);task.setNextAttemptAt(clock.instant());
        try{return tasks.saveAndFlush(task).getId();}catch(DataIntegrityViolationException conflict){return tasks.findByObjectKey(key).orElseThrow(()->conflict).getId();}
    }

    @Transactional(propagation=Propagation.REQUIRES_NEW) public void process(Long id){
        ObjectCleanupTask task=tasks.findLockedById(id).orElse(null);if(task==null||"SUCCESS".equals(task.getStatut())||"FAILED".equals(task.getStatut()))return;
        try{storage.delete(task.getObjectKey());task.setStatut("SUCCESS");task.setLastError(null);task.setCompletedAt(clock.instant());}
        catch(RuntimeException failure){int attempt=task.getTentatives()+1;task.setTentatives(attempt);task.setLastError("STORAGE_UNAVAILABLE");
            if(attempt>=MAX_ATTEMPTS){task.setStatut("FAILED");log.error("Nettoyage objet définitivement échoué, taskId={}",task.getId());}
            else{task.setStatut("RETRY");long delay=Math.min(3600,30L*(1L<<Math.min(attempt-1,6)));task.setNextAttemptAt(clock.instant().plusSeconds(delay));log.warn("Nettoyage objet à réessayer, taskId={}, tentative={}",task.getId(),attempt);}
        }
    }

    @Transactional @Scheduled(fixedDelayString="${app.storage.cleanup-scan-ms:60000}") public void retryDue(){
        tasks.findDueIds(clock.instant(),PageRequest.of(0,20)).forEach(id->{try{process(id);}catch(RuntimeException failure){log.warn("Traitement nettoyage interrompu, taskId={}",id);}});
    }
}
