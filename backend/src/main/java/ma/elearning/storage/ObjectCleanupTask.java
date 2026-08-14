package ma.elearning.storage;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="object_cleanup_tasks", uniqueConstraints=@UniqueConstraint(name="uk_object_cleanup_key", columnNames="object_key"))
public class ObjectCleanupTask {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="object_key",nullable=false,length=512) private String objectKey;
    @Column(nullable=false,length=20) private String statut="PENDING";
    @Column(nullable=false) private int tentatives;
    @Column(name="next_attempt_at",nullable=false) private Instant nextAttemptAt=Instant.now();
    @Column(name="last_error",length=120) private String lastError;
    @Column(name="created_at",nullable=false,updatable=false) private Instant createdAt=Instant.now();
    @Column(name="completed_at") private Instant completedAt;
    public Long getId(){return id;} public String getObjectKey(){return objectKey;} public void setObjectKey(String value){objectKey=value;}
    public String getStatut(){return statut;} public void setStatut(String value){statut=value;} public int getTentatives(){return tentatives;} public void setTentatives(int value){tentatives=value;}
    public Instant getNextAttemptAt(){return nextAttemptAt;} public void setNextAttemptAt(Instant value){nextAttemptAt=value;} public String getLastError(){return lastError;} public void setLastError(String value){lastError=value;}
    public Instant getCreatedAt(){return createdAt;} public Instant getCompletedAt(){return completedAt;} public void setCompletedAt(Instant value){completedAt=value;}
}
