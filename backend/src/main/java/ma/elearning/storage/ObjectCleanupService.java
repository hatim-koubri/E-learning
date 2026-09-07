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
    private final ObjectCleanupTaskRepository tasks; private final Clock clock; private final ObjectCleanupProcessor processor;
    public ObjectCleanupService(ObjectCleanupTaskRepository tasks,Clock clock,ObjectCleanupProcessor processor){this.tasks=tasks;this.clock=clock;this.processor=processor;}

    @Transactional public Long enqueue(String key){return create(key);}
    @Transactional(propagation=Propagation.REQUIRES_NEW) public Long enqueueCompensation(String key){return create(key);}
    private Long create(String key){
        ObjectCleanupTask existing=tasks.findByObjectKey(key).orElse(null);if(existing!=null)return existing.getId();
        ObjectCleanupTask task=new ObjectCleanupTask();task.setObjectKey(key);task.setNextAttemptAt(clock.instant());
        try{return tasks.saveAndFlush(task).getId();}catch(DataIntegrityViolationException conflict){return tasks.findByObjectKey(key).orElseThrow(()->conflict).getId();}
    }

    public void process(Long id){processor.process(id);}

    @Transactional @Scheduled(fixedDelayString="${app.storage.cleanup-scan-ms:60000}") public void retryDue(){
        tasks.findDueIds(clock.instant(),PageRequest.of(0,20)).forEach(id->{try{process(id);}catch(RuntimeException failure){log.warn("Traitement nettoyage interrompu, taskId={}",id);}});
    }
}
