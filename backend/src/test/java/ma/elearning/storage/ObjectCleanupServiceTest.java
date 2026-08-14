package ma.elearning.storage;

import org.junit.jupiter.api.*;
import java.time.*;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ObjectCleanupServiceTest {
    ObjectCleanupTaskRepository tasks=mock(ObjectCleanupTaskRepository.class);ObjectStorage storage=mock(ObjectStorage.class);
    Clock clock=Clock.fixed(Instant.parse("2026-08-10T12:00:00Z"),ZoneOffset.UTC);ObjectCleanupService service=new ObjectCleanupService(tasks,storage,clock);
    @Test void missingOrExistingObjectIsAnIdempotentSuccess(){ObjectCleanupTask task=task();when(tasks.findLockedById(1L)).thenReturn(Optional.of(task));service.process(1L);assertEquals("SUCCESS",task.getStatut());service.process(1L);verify(storage,times(1)).delete("formations/1/file.pdf");}
    @Test void unavailableStorageKeepsDurableRetry(){ObjectCleanupTask task=task();when(tasks.findLockedById(1L)).thenReturn(Optional.of(task));doThrow(new RuntimeException("secret=https://signed.example/token")).when(storage).delete(anyString());service.process(1L);assertEquals("RETRY",task.getStatut());assertEquals(1,task.getTentatives());assertEquals("STORAGE_UNAVAILABLE",task.getLastError());assertTrue(task.getNextAttemptAt().isAfter(clock.instant()));}
    @Test void simulatedRestartCanRetryPersistedTask(){ObjectCleanupTask task=task();task.setStatut("RETRY");task.setTentatives(2);when(tasks.findLockedById(1L)).thenReturn(Optional.of(task));service.process(1L);assertEquals("SUCCESS",task.getStatut());assertNotNull(task.getCompletedAt());}
    private ObjectCleanupTask task(){ObjectCleanupTask task=new ObjectCleanupTask();task.setObjectKey("formations/1/file.pdf");return task;}
}
