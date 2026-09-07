package ma.elearning.orientation;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;

@Entity @Table(name="orientation_messages")
public class OrientationMessage {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="conversation_id") private OrientationConversation conversation;
    @Column(nullable=false,length=20) private String role;
    @Lob @Column(nullable=false,columnDefinition="text") private String contenu;
    @Column(nullable=false,length=20) private String statut="COMPLETE";
    @Column(length=100) private String modele;
    @Column(name="duree_ms") private Long dureeMs;
    @Column(name="request_id",length=64) private String requestId;
    @CreationTimestamp @Column(name="created_at",nullable=false,updatable=false) private Instant createdAt;
    public Long getId(){return id;} public OrientationConversation getConversation(){return conversation;} public void setConversation(OrientationConversation v){conversation=v;}
    public String getRole(){return role;} public void setRole(String v){role=v;} public String getContenu(){return contenu;} public void setContenu(String v){contenu=v;}
    public String getStatut(){return statut;} public void setStatut(String v){statut=v;} public String getModele(){return modele;} public void setModele(String v){modele=v;}
    public Long getDureeMs(){return dureeMs;} public void setDureeMs(Long v){dureeMs=v;} public String getRequestId(){return requestId;} public void setRequestId(String v){requestId=v;}
    public Instant getCreatedAt(){return createdAt;}
}
